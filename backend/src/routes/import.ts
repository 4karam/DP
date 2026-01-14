import { FastifyRequest, FastifyReply } from 'fastify';
import { ImportController } from '../controllers/importController';

// We need to define the Type here to match Fastify's expectations, even if we don't use it directly in the handler signature
// because the controller method expects a specific Request type.
// However, since we are delegating to the controller, we can cast or just let the controller handle typing.
const controller = new ImportController();

export async function importHandler(
  request: FastifyRequest<any>,
  reply: FastifyReply
) {
  return controller.importData(request, reply);
}
