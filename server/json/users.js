import { v4 as uuidv4 } from 'uuid';

export let users = [
  { 
    id: uuidv4(), 
    username: 'alice', 
    email: 'alice@example.com', 
    full_name: 'Alice Example', 
    created_at: new Date().toISOString(),
    task_count: 0
  },
  { 
    id: uuidv4(), 
    username: 'bob', 
    email: 'bob@example.com', 
    full_name: 'Bob Example', 
    created_at: new Date().toISOString(),
    task_count: 0
  }
];

const usersRoutes = async function (fastify, opts) {
  // List
  fastify.get('/', async () => users);

  // Create
  fastify.post('/', async (request, reply) => {
    const { username, email, full_name } = request.body ?? {};
    if (!username || !email) return reply.code(400).send({ error: 'username and email are required' });

    if (users.some(u => u.username === username)) return reply.code(409).send({ error: 'username already exists' });
    if (users.some(u => u.email === email)) return reply.code(409).send({ error: 'email already exists' });

    const newUser = {
      id: uuidv4(),
      username,
      email,
      full_name: full_name ?? null,
      created_at: new Date().toISOString(),
      task_count: 0
    };
    users.push(newUser);
    return reply.code(201).send(newUser);
  });

  // Get single
  fastify.get('/:id', async (request, reply) => {
    const user = users.find(u => u.id === request.params.id);
    if (!user) return reply.code(404).send({ error: 'User not found' });
    return user;
  });

  // Update partial
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params;
    const { username, email, full_name } = request.body ?? {};
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return reply.code(404).send({ error: 'User not found' });

    if (username && users.some(u => u.username === username && u.id !== id)) {
      return reply.code(409).send({ error: 'username already exists' });
    }
    if (email && users.some(u => u.email === email && u.id !== id)) {
      return reply.code(409).send({ error: 'email already exists' });
    }

    const user = users[idx];
    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (full_name !== undefined) user.full_name = full_name;
    user.updated_at = new Date().toISOString();

    users[idx] = user;
    return user;
  });

  // Delete
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const prevLen = users.length;
    users = users.filter(u => u.id !== id);
    if (users.length === prevLen) return reply.code(404).send({ error: 'User not found' });
    return reply.code(204).send();
  });
};

export default usersRoutes;
