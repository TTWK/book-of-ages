import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

const fastify = Fastify({ logger: true });

fastify.register(cors);
fastify.register(multipart);

fastify.get('/', async (request, reply) => {
  return { hello: 'Book of Ages Server' };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();