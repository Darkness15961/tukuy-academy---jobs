/** Tipos para que el IDE typecheckee Edge Functions Deno sin la extensión Deno. */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
};

declare module "npm:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "npm:@aws-sdk/client-s3@3.787.0" {
  export class S3Client {
    constructor(config?: Record<string, unknown>);
    send(command: unknown): Promise<unknown>;
  }
  export class PutObjectCommand {
    constructor(input: Record<string, unknown>);
  }
  export class GetObjectCommand {
    constructor(input: Record<string, unknown>);
  }
}

declare module "npm:@aws-sdk/s3-request-presigner@3.787.0" {
  export function getSignedUrl(
    client: unknown,
    command: unknown,
    options?: { expiresIn?: number },
  ): Promise<string>;
}
