import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

type HeaderReadableRequest = {
  header(name: string): string | undefined;
};

@Injectable()
export class OpsApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const configuredKey = process.env.OPS_API_KEY?.trim();
    if (!configuredKey) return true;

    const request = context.switchToHttp().getRequest<HeaderReadableRequest>();
    const providedKey = request.header("x-ops-api-key")?.trim();
    if (providedKey === configuredKey) return true;

    throw new UnauthorizedException("Invalid x-ops-api-key");
  }
}
