import "fastify";
import { CookieSerializeOptions } from "@fastify/cookie";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyReply {
    setCookie(
      name: string,
      value: string,
      options?: CookieSerializeOptions
    ): this;
    clearCookie(name: string, options?: CookieSerializeOptions): this;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    googleOAuth2: {
      generateAuthorizationUri: (
        request: FastifyRequest,
        reply: FastifyReply
      ) => any;
      getAccessTokenFromAuthorizationCodeFlow: (
        request: FastifyRequest
      ) => Promise<{ token: { access_token: string } }>;
    };
    facebookOAuth2: {
      generateAuthorizationUri: (
        request: FastifyRequest,
        reply: FastifyReply
      ) => any;
      getAccessTokenFromAuthorizationCodeFlow: (
        request: FastifyRequest
      ) => Promise<{ token: { access_token: string } }>;
    };
  }
}
