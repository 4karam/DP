import { FastifyRequest, FastifyReply } from 'fastify';
import { ImportController } from '../controllers/importController';

const helper = new ImportController();

export async function uploadHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  return helper.uploadFile(request, reply);
}
