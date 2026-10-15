import type { RequestContext } from "./context";

/** The part of the request context domain services need. Tests build it directly. */
export type ServiceCtx = Pick<RequestContext, "userId" | "ledgerId" | "today">;
