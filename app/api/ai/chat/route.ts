import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { toolDeclarations, executeTool } from "@/lib/ai/tools";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * POST /api/ai/chat
 * Body: { sessionId?: string, message: string }
 *
 * Streams Server-Sent-Events back to the client with three event types:
 *  - {type: "token", text}        incremental assistant text
 *  - {type: "tool_call", name, args, result, reasoning}  a tool the
 *    agent invoked, plus a short explanation of why (Explainability
 *    requirement)
 *  - {type: "done", sessionId}
 *
 * Tool-calling loop: we send the user message + history + tool
 * declarations to Gemini. If Gemini responds with a function_call part
 * instead of text, we execute it server-side (tenant-scoped), append
 * the result as a function_response turn, and call Gemini again. We
 * repeat until Gemini returns a plain text answer or we hit MAX_STEPS,
 * which prevents infinite tool-call loops.
 */
const MAX_STEPS = 5;

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(); // throws 401 if not logged in (caught by Next's error boundary -> handled below)
  const { sessionId: incomingSessionId, message } = await req.json();

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: auth.tenantId } });

  let session = incomingSessionId
    ? await prisma.chatSession.findFirst({ where: { id: incomingSessionId, tenantId: auth.tenantId } })
    : null;
  if (!session) {
    session = await prisma.chatSession.create({
      data: { tenantId: auth.tenantId, userId: auth.sub, title: message.slice(0, 60) },
    });
  }

  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: "USER", content: message },
  });

  const history = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  const systemInstruction = `You are the AI business assistant for "${tenant.name}" (industry: ${tenant.industry ?? "unspecified"}).
You can search contacts, create tasks, update opportunities, send WhatsApp messages, and fetch live business metrics using the available tools.
Always ground your answers in real data from tools rather than guessing.
After taking any action, briefly explain WHY you took it (one short sentence) so the business owner can trust your reasoning.
Be concise and conversational, like a sharp operations assistant — not a generic chatbot.`;

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
    systemInstruction,
    tools: [{ functionDeclarations: toolDeclarations as any }],
  });

  const geminiHistory = history
    .filter((m: (typeof history)[number]) => m.role !== "TOOL")
    .map((m: (typeof history)[number]) => ({
      role: m.role === "USER" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const chat = model.startChat({ history: geminiHistory.slice(0, -1) }); // last item is the current message, sent below
        let currentMessageParts: any = message;
        let finalText = "";

        for (let step = 0; step < MAX_STEPS; step++) {
          const result = await chat.sendMessageStream(currentMessageParts);

          let stepText = "";
          const functionCalls: any[] = [];

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              stepText += chunkText;
              send({ type: "token", text: chunkText });
            }
            const calls = chunk.functionCalls?.();
            if (calls?.length) functionCalls.push(...calls);
          }

          if (functionCalls.length === 0) {
            finalText += stepText;
            break;
          }

          // Execute each requested tool call, tenant-scoped, and feed
          // the results back to the model as function_response parts.
          const responseParts: any[] = [];
          for (const call of functionCalls) {
            let result_: any;
            let error: string | undefined;
            try {
              result_ = await executeTool(auth.tenantId, auth.sub, call.name, call.args ?? {});
            } catch (e) {
              error = e instanceof Error ? e.message : "tool execution failed";
              result_ = { error };
            }

            const reasoning = `Called ${call.name} to satisfy the user's request: "${message}".`;

            await prisma.chatMessage.create({
              data: {
                sessionId: session!.id,
                role: "TOOL",
                content: stepText || `[invoked ${call.name}]`,
                toolName: call.name,
                toolArgs: call.args as any,
                toolResult: result_ as any,
                reasoning,
              },
            });

            send({ type: "tool_call", name: call.name, args: call.args, result: result_, reasoning });

            responseParts.push({
              functionResponse: { name: call.name, response: result_ },
            });
          }

          currentMessageParts = responseParts;
        }

        await prisma.chatMessage.create({
          data: { sessionId: session!.id, role: "ASSISTANT", content: finalText },
        });

        send({ type: "done", sessionId: session!.id });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "AI agent failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
