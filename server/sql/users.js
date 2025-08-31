import { getSQLPool } from '../db/sql.js';
import { v4 as uuidv4 } from 'uuid';

const usersRoutes = async function (fastify) {
  // GET all
  fastify.get('/', async (request, reply) => {
    try {
      const pool = await getSQLPool();
      const result = await pool.request().query('SELECT * FROM dbo.Users ORDER BY CreatedAt DESC');
      return reply.status(200).send(result.recordset);
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch users', details: err.message });
    }
  });

  // GET by Id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const pool = await getSQLPool();
      const result = await pool.request().input('Id', id).query('SELECT * FROM dbo.Users WHERE Id = @Id');
      if (!result.recordset.length) return reply.status(404).send({ error: 'User not found' });
      return reply.status(200).send(result.recordset[0]);
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch user', details: err.message });
    }
  });

  // CREATE
  fastify.post('/', async (request, reply) => {
    const { Username, Email, FullName, Role } = request.body || {};
    if (!Username || !Email || !FullName) return reply.status(400).send({ error: 'Username, Email, and FullName are required' });

    try {
      const pool = await getSQLPool();
      const newId = uuidv4();

      await pool.request()
        .input('Id', newId)
        .input('Username', Username)
        .input('Email', Email)
        .input('FullName', FullName)
        .input('Role', Role || 'member')
        .query(`
          INSERT INTO dbo.Users (Id, Username, Email, FullName, Role)
          VALUES (@Id, @Username, @Email, @FullName, @Role)
        `);

      const userResult = await pool.request().input('Id', newId).query('SELECT * FROM dbo.Users WHERE Id = @Id');
      return reply.status(201).send({ message: 'User created successfully', user: userResult.recordset[0] });
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to create user', details: err.message });
    }
  });

  // UPDATE
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { Username, Email, FullName, Role } = request.body || {};
    if (!Username && !Email && !FullName && !Role) return reply.status(400).send({ error: 'No fields to update' });

    try {
      const pool = await getSQLPool();
      await pool.request()
        .input('Id', id)
        .input('Username', Username || null)
        .input('Email', Email || null)
        .input('FullName', FullName || null)
        .input('Role', Role || null)
        .query(`
          UPDATE dbo.Users
          SET Username = COALESCE(@Username, Username),
              Email = COALESCE(@Email, Email),
              FullName = COALESCE(@FullName, FullName),
              Role = COALESCE(@Role, Role)
          WHERE Id = @Id
        `);

      const userResult = await pool.request().input('Id', id).query('SELECT * FROM dbo.Users WHERE Id = @Id');
      if (!userResult.recordset.length) return reply.status(404).send({ error: 'User not found' });
      return reply.status(200).send({ message: 'User updated successfully', user: userResult.recordset[0] });
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to update user', details: err.message });
    }
  });

  // DELETE
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const pool = await getSQLPool();
      const result = await pool.request().input('Id', id).query('DELETE FROM dbo.Users WHERE Id = @Id');
      if ((result.rowsAffected?.[0] || 0) === 0) return reply.status(404).send({ error: 'User not found' });
      return reply.send({ message: 'User deleted successfully', userId: id });
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to delete user', details: err.message });
    }
  });
};

export default usersRoutes;
