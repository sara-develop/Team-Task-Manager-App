import { getSQLPool } from '../db/sql.js';
import { v4 as uuidv4 } from 'uuid';

const projectsRoutes = async function (fastify) {
  // GET all
  fastify.get('/', async (request, reply) => {
    try {
      const pool = await getSQLPool();
      const result = await pool.request()
        .query('SELECT * FROM dbo.Projects ORDER BY CreatedAt DESC');
      return result.recordset;
    } catch (err) {
      request.log.error('Error fetching projects:', err);
      return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
    }
  });

  // GET one
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const pool = await getSQLPool();
      const result = await pool.request()
        .input('Id', id)
        .query('SELECT * FROM dbo.Projects WHERE Id = @Id');

      if (!result.recordset.length)
        return reply.status(404).send({ error: 'Project not found' });
      return result.recordset[0];
    } catch (err) {
      request.log.error(`Error fetching project ${id}:`, err);
      return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
    }
  });

  // CREATE
  fastify.post('/', async (request, reply) => {
    const { name, description } = request.body ?? {};
    if (!name)
      return reply.status(400).send({ error: 'Project name is required' });

    try {
      const pool = await getSQLPool();
      const newId = uuidv4();

      await pool.request()
        .input('Id', newId)
        .input('Name', name)
        .input('Description', description ?? null)
        .input('CreatedAt', new Date())
        .input('UpdatedAt', new Date())
        .query(`
          INSERT INTO dbo.Projects (Id, Name, Description, CreatedAt, UpdatedAt)
          VALUES (@Id, @Name, @Description, @CreatedAt, @UpdatedAt)
        `);

      const result = await pool.request()
        .input('Id', newId)
        .query('SELECT * FROM dbo.Projects WHERE Id = @Id');

      return reply.status(201).send(result.recordset[0]);
    } catch (err) {
      request.log.error('Error creating project:', err);
      return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
    }
  });

  // UPDATE (partial)
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, description } = request.body ?? {};

    if (name === undefined && description === undefined) {
      return reply.status(400).send({ error: 'No fields to update' });
    }

    try {
      const pool = await getSQLPool();

      await pool.request()
        .input('Id', id)
        .input('Name', name ?? null)
        .input('Description', description ?? null)
        .input('UpdatedAt', new Date())
        .query(`
        UPDATE dbo.Projects
        SET Name = COALESCE(@Name, Name),
            Description = COALESCE(@Description, Description),
            UpdatedAt = @UpdatedAt
        WHERE Id = @Id
    `);

      const result = await pool.request()
        .input('Id', id)
        .query('SELECT * FROM dbo.Projects WHERE Id = @Id');

      if (!result.recordset.length)
        return reply.status(404).send({ error: 'Project not found' });

      return result.recordset[0];

    } catch (err) {
      request.log.error(`Error updating project ${id}:`, err);
      return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
    }
  });

  // DELETE
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const pool = await getSQLPool();
      const result = await pool.request()
        .input('Id', id)
        .query('DELETE FROM dbo.Projects WHERE Id = @Id');

      if ((result.rowsAffected?.[0] || 0) === 0)
        return reply.status(404).send({ error: 'Project not found' });

      return reply.status(200).send({ message: 'Project deleted successfully', projectId: id });

    } catch (err) {
      request.log.error(`Error deleting project ${id}:`, err);
      return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
    }
  });

};

export default projectsRoutes;
