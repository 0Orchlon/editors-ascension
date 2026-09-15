/**
 * RFC 9457 `application/problem+json` (lld.md §6.10; AC BE-16).
 *
 * ⚠ БҮХ 4xx/5xx нэг замаар гарна. Stack trace хариунд ХЭЗЭЭ Ч орохгүй.
 */
import type { Issue, Problem } from '../../../shared/types/index.ts';

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

export class HttpProblem extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: string;
  readonly errors?: Issue[];
  readonly actionId?: string;
  readonly headers?: Record<string, string>;

  constructor(init: {
    status: number;
    code: string;
    detail?: string;
    errors?: Issue[];
    actionId?: string;
    headers?: Record<string, string>;
  }) {
    super(`${init.status} ${init.code}`);
    this.name = 'HttpProblem';
    this.status = init.status;
    this.code = init.code;
    if (init.detail !== undefined) this.detail = init.detail;
    if (init.errors !== undefined) this.errors = init.errors;
    if (init.actionId !== undefined) this.actionId = init.actionId;
    if (init.headers !== undefined) this.headers = init.headers;
  }
}

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  410: 'Gone',
  413: 'Payload Too Large',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

export function toProblem(error: unknown, instance: string): { body: Problem; headers: Record<string, string> } {
  const problem =
    error instanceof HttpProblem
      ? error
      : // ⚠ Гэнэтийн алдааны дотоод мэдээлэл ГАДАГШ гарахгүй (AC BE-16).
        new HttpProblem({ status: 500, code: 'INTERNAL' });

  const body: Problem = {
    type: `about:blank#${problem.code}`,
    title: TITLES[problem.status] ?? 'Error',
    status: problem.status,
    instance,
    code: problem.code,
  };
  if (problem.detail !== undefined) body.detail = problem.detail;
  if (problem.errors !== undefined) body.errors = problem.errors;
  if (problem.actionId !== undefined) body.actionId = problem.actionId;

  return { body, headers: problem.headers ?? {} };
}

export const unauthorized = (): HttpProblem => new HttpProblem({ status: 401, code: 'UNAUTHORIZED' });
export const forbidden = (): HttpProblem => new HttpProblem({ status: 403, code: 'FORBIDDEN' });
export const notFound = (detail?: string): HttpProblem =>
  new HttpProblem(detail === undefined ? { status: 404, code: 'NOT_FOUND' } : { status: 404, code: 'NOT_FOUND', detail });
export const etagMismatch = (): HttpProblem => new HttpProblem({ status: 409, code: 'ETAG_MISMATCH' });
/** ⚠ Гурван бүтэлгүй тохиолдол ижил хариу — кодын оршин тогтнол задрахгүй (lld.md §6.9). */
export const transferCodeInvalid = (): HttpProblem =>
  new HttpProblem({ status: 410, code: 'TRANSFER_CODE_INVALID' });
export const bodyTooLarge = (): HttpProblem => new HttpProblem({ status: 413, code: 'BODY_TOO_LARGE' });
export const invalidBody = (errors: Issue[]): HttpProblem =>
  new HttpProblem({ status: 400, code: 'INVALID_BODY', errors });
export const contentUnavailable = (detail: string): HttpProblem =>
  new HttpProblem({ status: 503, code: 'CONTENT_UNAVAILABLE', detail });
export const rateLimited = (retryAfterSeconds: number): HttpProblem =>
  new HttpProblem({
    status: 429,
    code: 'RATE_LIMITED',
    headers: { 'retry-after': String(retryAfterSeconds) },
  });
export const domainRejection = (reason: string, actionId?: string): HttpProblem =>
  new HttpProblem(
    actionId === undefined
      ? { status: 422, code: reason }
      : { status: 422, code: reason, actionId },
  );
