export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
}

import { Buffer } from 'buffer';
import { getServerStatus } from './minecraft';

const jsonResponse = (object: unknown, opts?: ResponseInit) => {
  return new Response(JSON.stringify(object, null, 2), {
    ...opts,
    headers: { 'content-type': 'application/json', ...opts?.headers },
  });
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // polyfill for other modules
    (globalThis as any).Buffer = Buffer;

    const { searchParams } = new URL(request.url);

    const hostname = searchParams.get('hostname');
    const port = parseInt(searchParams.get('port') ?? '25565', 10);

    if (!hostname) {
      return jsonResponse(
        { message: `'hostname' not provided` },
        { status: 400 }
      );
    }

    try {
      const status = await getServerStatus({
        hostname,
        port,
      });

      return jsonResponse({
        ok: true,
        status,
      });
    } catch (error: unknown) {
      if (
        (error as { message: string }).message.includes(
          'Network connection lost'
        )
      ) {
        return jsonResponse({
          ok: false,
          message: `'${hostname}:${port}' is unavailable`,
          data: { hostname, port },
        });
      }

      return jsonResponse(
        {
          message: 'unknown issue occurred',
          data: {
            hostname,
            port,
            internalError: {
              message: (error as { message?: string }).message,
            },
          },
        },
        {
          status: 500,
        }
      );
    }
  },
};
