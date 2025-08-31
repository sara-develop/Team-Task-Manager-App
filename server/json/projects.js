import { v4 as uuidv4 } from 'uuid';

let projects = [
  { id: uuidv4(), name: 'Website Redesign' },
  { id: uuidv4(), name: 'Mobile App Development' },
  { id: uuidv4(), name: 'Marketing Campaign' }
];

const projectsRoutes = async function (fastify, opts) {
  fastify.get('/', async (request, reply) => {
    return projects;
  });

  fastify.post('/', async (request, reply) => {
    const { name } = request.body ?? {};
    if (!name) return reply.code(400).send({ error: 'Name is required' });

    const newProject = { id: uuidv4(), name };
    projects.push(newProject);
    return reply.code(201).send(newProject);
  });

};



export default projectsRoutes;
