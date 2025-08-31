import { getSQLPool } from '../db/sql.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();
import { getRabbitChannel } from '../mq/rabbit.js';

const tasksRoutes = async function (fastify) {
  const maxTasks = parseInt(process.env.MAX_TASKS_PER_USER, 10) || 7;

  // Redis Helpers 
  async function invalidateKanbanCache(server) {
    try {
      if (server.redis) await server.redis.del('kanban:tasks_by_status');
    } catch { }
  }

  async function getCachedTasks(server) {
    if (server.redis) {
      const cached = await server.redis.get('kanban:tasks_by_status');
      if (cached) return JSON.parse(cached);
    }
    return null;
  }

  async function setCachedTasks(server, data) {
    if (server.redis) {
      await server.redis.set('kanban:tasks_by_status', JSON.stringify(data), { EX: 60 * 5 }); // 5 דקות
    }
  }
  // CREATE TASK
  fastify.post('/', async (request, reply) => {
    const { ProjectId, Title, Description, Status, AssigneeId } = request.body || {};

    // 1️⃣ בדיקות בסיסיות
    if (!ProjectId || !Title) {
      return reply.status(400).send({ error: 'ProjectId and Title are required' });
    }
    if (Status && !['Open', 'In Progress', 'Done'].includes(Status)) {
      return reply.status(400).send({ error: 'Invalid status' });
    }

    try {
      const pool = await getSQLPool();
      const maxTasks = parseInt(process.env.MAX_TASKS_PER_USER, 10) || 7;

      // 2️⃣ בדיקת מספר משימות למשתמש
      if (AssigneeId) {
        const cntRes = await pool.request()
          .input('AssigneeId', AssigneeId)
          .query(`
          SELECT COUNT(*) AS cnt
          FROM dbo.Tasks
          WHERE AssigneeId = @AssigneeId
            AND Status IN ('Open','In Progress')
        `);

        if (cntRes.recordset[0].cnt >= maxTasks) {
          return reply.status(400).send({
            error: `User already has the maximum allowed tasks (${maxTasks})`
          });
        }
      }

      // 3️⃣ יצירת המשימה ב-SQL
      const newId = uuidv4();
      await pool.request()
        .input('Id', newId)
        .input('ProjectId', ProjectId)
        .input('Title', Title)
        .input('Description', Description || '')
        .input('Status', Status || 'Open')
        .input('AssigneeId', AssigneeId || null)
        .input('CreatedAt', new Date())
        .input('UpdatedAt', new Date())
        .query(`
        INSERT INTO dbo.Tasks 
          (Id, ProjectId, Title, Description, Status, AssigneeId, CreatedAt, UpdatedAt)
        VALUES 
          (@Id, @ProjectId, @Title, @Description, @Status, @AssigneeId, @CreatedAt, @UpdatedAt)
      `);

      // 4️⃣ שליפת המשימה שנוצרה
      const taskResult = await pool.request()
        .input('Id', newId)
        .query('SELECT * FROM dbo.Tasks WHERE Id = @Id');
      const newTask = taskResult.recordset[0];

      // 5️⃣ ניקוי Cache של Redis
      try {
        if (fastify.redis) await fastify.redis.del('kanban:tasks_by_status');
      } catch (err) {
        request.log.warn('Failed to clear Redis cache:', err.message);
      }

      // 6️⃣ שליחת הודעה ל-RabbitMQ
      try {
        const channel = getRabbitChannel();
        if (channel) {
          channel.sendToQueue(
            'task_notifications',
            Buffer.from(JSON.stringify({
              taskId: newId,
              title: Title,
              assigneeId: AssigneeId || null,
              action: 'created'
            }))
          );
        }
      } catch (err) {
        request.log.error('Failed to publish task notification:', err.message);
      }

      // 7️⃣ החזרת תגובה
      return reply.status(201).send({
        message: 'Task created successfully',
        task: newTask
      });

    } catch (err) {
      return reply.status(500).send({ error: 'Failed to create task', details: err.message });
    }
  });

  // GET all
  fastify.get('/', async (request, reply) => {
    try {
      const cached = await getCachedTasks(fastify);
      if (cached) return cached;

      const pool = await getSQLPool();
      const result = await pool.request().query('SELECT * FROM dbo.Tasks ORDER BY CreatedAt DESC');

      await setCachedTasks(fastify, result.recordset);

      return result.recordset;
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });
  
  // GET by Id 
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const pool = await getSQLPool();
      const result = await pool.request().input('Id', id).query('SELECT * FROM dbo.Tasks WHERE Id = @Id');
      if (!result.recordset.length) return reply.status(404).send({ error: 'Task not found' });
      return result.recordset[0];
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // UPDATE task 
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { Title, Description, Status, AssigneeId } = request.body || {};

    if (!Title && !Description && !Status && (AssigneeId === undefined)) {
      return reply.status(400).send({ error: 'No fields to update' });
    }
    if (Status && !['Open', 'In Progress', 'Done'].includes(Status)) {
      return reply.status(400).send({ error: 'Invalid status' });
    }

    try {
      const pool = await getSQLPool();
      const existingTaskRes = await pool.request()
        .input('Id', id)
        .query('SELECT * FROM dbo.Tasks WHERE Id = @Id');

      if (!existingTaskRes.recordset.length) return reply.status(404).send({ error: 'Task not found' });
      const existingTask = existingTaskRes.recordset[0];

      const newStatus = (Status === undefined) ? existingTask.Status : Status;
      const assigneeWasProvided = Object.prototype.hasOwnProperty.call(request.body, 'AssigneeId');
      let newAssignee = assigneeWasProvided ? AssigneeId : existingTask.AssigneeId;

      const activeStatuses = ['Open', 'In Progress'];
      const willBeActive = activeStatuses.includes(newStatus);

      let assigneeWasRemovedDueLimit = false;
      if (newAssignee) {
        const cntReq = pool.request()
          .input('AssigneeId', newAssignee)
          .input('Id', id);
        const cntRes = await cntReq.query(`
          SELECT COUNT(*) AS cnt
          FROM dbo.Tasks
          WHERE AssigneeId = @AssigneeId
            AND Status IN ('Open','In Progress')
            AND Id <> @Id
        `);
        const currentActiveCount = cntRes.recordset[0].cnt || 0;
        if (willBeActive && currentActiveCount >= maxTasks) {
          newAssignee = null;
          assigneeWasRemovedDueLimit = true;
        }
      }

      await pool.request()
        .input('Id', id)
        .input('Title', Title ?? null)
        .input('Description', Description ?? null)
        .input('Status', newStatus ?? null)
        .input('AssigneeId', newAssignee ?? null)
        .input('UpdatedAt', new Date())
        .query(`
        UPDATE dbo.Tasks
        SET Title = COALESCE(@Title, Title),
            Description = COALESCE(@Description, Description),
            Status = COALESCE(@Status, Status),
            AssigneeId = @AssigneeId,
            UpdatedAt = @UpdatedAt
        WHERE Id = @Id
      `);

      const result = await pool.request().input('Id', id).query('SELECT * FROM dbo.Tasks WHERE Id = @Id');
      const updatedTask = result.recordset[0];

      await invalidateKanbanCache(fastify);

      if (assigneeWasRemovedDueLimit) {
        return reply.send({
          message: `Assignee removed: user already has the maximum allowed active tasks (${maxTasks}). Please assign a different user.`,
          task: updatedTask
        });
      }

      return reply.send({ message: 'Task updated successfully', task: updatedTask });
    } catch (err) {
      request.log.error('Error updating task:', err);
      return reply.status(500).send({ error: err.message });
    }
  });

  // DELETE 
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const pool = await getSQLPool();
      const result = await pool.request().input('Id', id).query('DELETE FROM dbo.Tasks WHERE Id = @Id');
      if ((result.rowsAffected?.[0] || 0) === 0) return reply.status(404).send({ error: 'Task not found' });
      await invalidateKanbanCache(fastify);
      return reply.send({ message: 'Task deleted successfully', taskId: id });
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET tasks by project 
  fastify.get('/project/:projectId', async (request, reply) => {
    const { projectId } = request.params;
    try {
      const pool = await getSQLPool();
      const result = await pool.request()
        .input('ProjectId', projectId)
        .query('SELECT * FROM dbo.Tasks WHERE ProjectId = @ProjectId ORDER BY CreatedAt DESC');
      return result.recordset;
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch tasks for project', details: err.message });
    }
  });

  // UPDATE only Status 
  fastify.patch('/:id/status', async (request, reply) => {
    const { id } = request.params;
    const { Status } = request.body || {};

    if (!Status || !['Open', 'In Progress', 'Done'].includes(Status)) {
      return reply.status(400).send({ error: 'Invalid or missing status' });
    }

    try {
      const pool = await getSQLPool();
      await pool.request()
        .input('Id', id)
        .input('Status', Status)
        .input('UpdatedAt', new Date())
        .query(`
        UPDATE dbo.Tasks
        SET Status = @Status,
            UpdatedAt = @UpdatedAt
        WHERE Id = @Id
      `);

      const result = await pool.request().input('Id', id).query('SELECT * FROM dbo.Tasks WHERE Id = @Id');
      if (!result.recordset.length) return reply.status(404).send({ error: 'Task not found' });

      await invalidateKanbanCache(fastify);
      return reply.send({ message: 'Status updated successfully', task: result.recordset[0] });
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to update status', details: err.message });
    }
  });

  // GET user info for a task 
  fastify.get('/:id/assignee', async (request, reply) => {
    const { id } = request.params;
    try {
      const pool = await getSQLPool();
      const taskResult = await pool.request()
        .input('Id', id)
        .query('SELECT AssigneeId FROM dbo.Tasks WHERE Id = @Id');

      if (!taskResult.recordset.length) return reply.status(404).send({ error: 'Task not found' });

      const assigneeId = taskResult.recordset[0].AssigneeId;
      if (!assigneeId) return reply.send({ assignee: null });

      const userResult = await pool.request()
        .input('Id', assigneeId)
        .query('SELECT Id, Username, FullName FROM dbo.Users WHERE Id = @Id');

      if (!userResult.recordset.length) return reply.status(404).send({ error: 'Assignee not found' });

      return reply.send({ assignee: userResult.recordset[0] });
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch assignee', details: err.message });
    }
  });

  // CHECK assignee limit
  fastify.get('/:id/check-assignee-limit', async (request, reply) => {
    const { id } = request.params;
    const maxTasks = parseInt(process.env.MAX_TASKS_PER_USER, 10) || 7;
    const newStatus = request.query.newStatus;

    try {
      const pool = await getSQLPool();
      const taskRes = await pool.request()
        .input('Id', id)
        .query('SELECT AssigneeId, Status FROM dbo.Tasks WHERE Id = @Id');

      if (!taskRes.recordset.length) return reply.status(404).send({ error: 'Task not found' });

      const { AssigneeId: assigneeId, Status: currentStatus } = taskRes.recordset[0];
      if (!assigneeId) return reply.send({ allowed: true, reason: 'No assignee' });

      const countRes = await pool.request()
        .input('AssigneeId', assigneeId)
        .input('TaskId', id)
        .query(`
        SELECT COUNT(*) AS activeCount
        FROM dbo.Tasks
        WHERE AssigneeId = @AssigneeId
          AND Status IN ('Open','In Progress')
          AND Id <> @TaskId
      `);

      const activeCount = countRes.recordset[0].activeCount || 0;
      const isCurrentlyActive = ['Open', 'In Progress'].includes(currentStatus);
      const isNewActive = ['Open', 'In Progress'].includes(newStatus);

      if (!isCurrentlyActive && isNewActive && activeCount >= maxTasks) {
        return reply.send({
          allowed: false,
          message: `User already has the maximum allowed active tasks (${maxTasks}).`
        });
      }

      return reply.send({ allowed: true });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to check assignee limit', details: err.message });
    }
  });
};

export default tasksRoutes;
