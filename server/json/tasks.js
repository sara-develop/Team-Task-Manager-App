import { getRedisClient } from '../db/redis.js';
import { getRabbitChannel } from '../mq/rabbit.js';
import { users } from './users.js';
import { v4 as uuidv4 } from 'uuid';

const redis = getRedisClient();

// מערך בזיכרון שמכיל את כל המשימות
const AllTasks = [
  {
    id: 1,
    project_id: 101,
    assigned_user: 3,
    name: "Create landing page",
    description: "Design homepage layout",
    status: "Open"
  },
  {
    id: 2,
    project_id: 102,
    assigned_user: 5,
    name: "Setup database",
    description: "",
    status: "Open"
  }
];

const tasksRoutes = async function (fastify) {
  const maxTasks = Number(process.env.MAX_TASKS_PER_USER) || 5;

  // --- CREATE TASK ---
  fastify.post('/', async (request, reply) => {
    try {
      const { project_id, assigned_user, name, description } = request.body;

      if (!project_id || !assigned_user || !name) {
        return reply.status(400).send({ error: 'project_id, assigned_user, and name are required' });
      }

      const assignedUserId = String(assigned_user).trim();
      const projectId = String(project_id).trim();
      const assignedUser = users.find(u => u.id === assignedUserId);

      if (!assignedUser) return reply.status(400).send({ error: 'Assigned user does not exist' });

      if (assignedUser.task_count >= maxTasks) {
        return reply.status(400).send({
          error: `User "${assignedUser.username}" already has ${assignedUser.task_count} tasks assigned. Maximum allowed is ${maxTasks}.`
        });
      }

      const newTask = {
        id: uuidv4(),
        project_id: projectId,
        assigned_user: assignedUserId,
        name,
        description: description ?? '',
        status: 'Open',
        created_at: new Date().toISOString()
      };

      AllTasks.push(newTask);
      assignedUser.task_count += 1;

      // שמירה ל-Redis
      try { await redis.lPush('Open', JSON.stringify(newTask)); }
      catch (redisErr) { console.error('Redis error:', redisErr); }

      // הודעה ל-RabbitMQ
      try {
        const channel = getRabbitChannel();
        channel.sendToQueue(
          'task_notifications',
          Buffer.from(JSON.stringify({ user: assignedUserId, taskId: newTask.id }))
        );
      } catch (mqErr) { console.error('RabbitMQ error:', mqErr); }

      return reply.status(201).send(newTask);
    } catch (err) {
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // --- GET ALL TASKS ---
  fastify.get('/', async () => AllTasks);

  // --- GET TASK BY ID ---
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const task = AllTasks.find(t => t.id === id || t.id === Number(id));
    if (!task) return reply.status(404).send({ error: 'Task not found' });
    return task;
  });

  // --- GET TASKS BY PROJECT ---
  fastify.get('/project/:projectId', async (request, reply) => {
    const { projectId } = request.params;
    return AllTasks.filter(t => String(t.project_id) === String(projectId));
  });

  // --- UPDATE TASK STATUS ---
  fastify.put('/:id/status', async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body;

    if (!status || !['Open', 'In Progress', 'Done'].includes(status)) {
      return reply.status(400).send({ error: 'Invalid status. Allowed: Open, In Progress, Done' });
    }

    const task = AllTasks.find(t => t.id === id || t.id === Number(id));
    if (!task) return reply.status(404).send({ error: 'Task not found' });

    task.status = status;

    try {
      await redis.lRem('Open', 0, JSON.stringify(task));
      await redis.lRem('In Progress', 0, JSON.stringify(task));
      await redis.lRem('Done', 0, JSON.stringify(task));
      await redis.lPush(status, JSON.stringify(task));
    } catch (redisErr) { console.error('Redis error:', redisErr); }

    try {
      const channel = getRabbitChannel();
      channel.sendToQueue(
        'task_notifications',
        Buffer.from(JSON.stringify({ user: task.assigned_user, taskId: task.id, status }))
      );
    } catch (mqErr) { console.error('RabbitMQ error:', mqErr); }

    return reply.send(task);
  });

  // --- DELETE TASK ---
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const taskIdx = AllTasks.findIndex(t => t.id === id || t.id === Number(id));
    if (taskIdx === -1) return reply.status(404).send({ error: 'Task not found' });

    const task = AllTasks[taskIdx];
    const assignedUser = users.find(u => u.id === task.assigned_user);
    if (assignedUser && assignedUser.task_count > 0) assignedUser.task_count -= 1;

    AllTasks.splice(taskIdx, 1);

    try {
      await redis.lRem('Open', 0, JSON.stringify(task));
      await redis.lRem('In Progress', 0, JSON.stringify(task));
      await redis.lRem('Done', 0, JSON.stringify(task));
    } catch (redisErr) { console.error('Redis error:', redisErr); }

    return reply.status(204).send();
  });
};

export default tasksRoutes;
