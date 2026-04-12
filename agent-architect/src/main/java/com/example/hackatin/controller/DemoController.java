package com.example.hackatin.controller;

import com.example.hackatin.model.ProjectConfig;
import com.example.hackatin.repository.ProjectConfigRepository;
import com.example.hackatin.service.OpenAiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/demo")
public class DemoController {

    private static final String CONV_ATTR = "demo.conversation";

    private static final String BASE_SYSTEM = """
                        You are the scene director of a WhatsApp group for a software development team.
                        The group has four participants:
                            - "boss"     -> the user (technical lead). Gives instructions.
                            - "backend"  -> pragmatic backend engineer.
                            - "frontend" -> frontend engineer with design focus.
                            - "security" -> meticulous, paranoid security specialist.

                        When the boss sends a message, generate a realistic CONVERSATION where the three agents
                        discuss implementation, reply to each other, ask questions, propose solutions, and
                        reach an agreement. They should sound like a WhatsApp chat: short messages, natural tone,
                        occasional emojis, and light humor. Each turn must be from ONE agent only.

                        Respond EXCLUSIVELY with a JSON object using this exact schema:
            {
              "messages": [
                { "agent": "backend" | "frontend" | "security", "text": "..." }
              ]
            }

                        Rules:
                        - Between 4 and 8 messages per response.
                        - Never include "boss" in messages (the boss is the user).
                        - Do not use markdown or code blocks in text; plain text only.
                        - If the boss asks for something technical (e.g., "hash passwords"), agents must discuss concrete
                            details (e.g., bcrypt vs argon2, cost, salting, storage, UI error handling, backend validation).
                        - Always reply in English.
            """;

    private final OpenAiService openAi;
    private final ProjectConfigRepository repository;
    private final ObjectMapper mapper = new ObjectMapper();

    public DemoController(OpenAiService openAi, ProjectConfigRepository repository) {
        this.openAi = openAi;
        this.repository = repository;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, String>> getConversation(HttpSession session) {
        List<Map<String, String>> conv = (List<Map<String, String>>) session.getAttribute(CONV_ATTR);
        if (conv == null) {
            conv = new ArrayList<>();
            conv.add(Map.of("role", "system", "content", buildSystemPrompt(session)));
            session.setAttribute(CONV_ATTR, conv);
        }
        return conv;
    }

    private String buildSystemPrompt(HttpSession session) {
        StringBuilder sb = new StringBuilder(BASE_SYSTEM);
        repository.findBySessionId(session.getId()).ifPresent(cfg -> {
            sb.append("\n\nConfirmed project stack:\n");
            sb.append("- Backend: ").append(nz(cfg.getBackend())).append("\n");
            sb.append("- Frontend: ").append(nz(cfg.getFrontend())).append("\n");
            sb.append("- Database: ").append(nz(cfg.getDatabase())).append("\n");
            sb.append("Agents must use this stack in their discussion.\n");
        });
        return sb.toString();
    }

    private String nz(String s) { return s == null ? "(not defined)" : s; }

    @PostMapping("/message")
    public Map<String, Object> message(@RequestBody Map<String, String> body, HttpSession session) throws Exception {
        String userMessage = body.getOrDefault("message", "").trim();
        if (userMessage.isEmpty()) {
            return Map.of("messages", List.of());
        }

        List<Map<String, String>> conv = getConversation(session);
        conv.add(Map.of("role", "user", "content", userMessage));

        String raw;
        try {
            raw = openAi.chat(conv, true);
        } catch (Exception e) {
            return Map.of(
                    "messages", fallbackMessages(userMessage),
                    "error", e.getMessage()
            );
        }

        conv.add(Map.of("role", "assistant", "content", raw));

        List<Map<String, String>> parsed = parseMessages(raw);
        if (parsed.isEmpty()) {
            parsed = fallbackMessages(userMessage);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("messages", parsed);
        return result;
    }

    @PostMapping("/reset")
    public Map<String, String> reset(HttpSession session) {
        session.removeAttribute(CONV_ATTR);
        return Map.of("status", "ok");
    }

    private List<Map<String, String>> parseMessages(String raw) {
        List<Map<String, String>> out = new ArrayList<>();
        if (raw == null || raw.isBlank()) return out;
        try {
            JsonNode root = mapper.readTree(raw);
            JsonNode arr = root.get("messages");
            if (arr != null && arr.isArray()) {
                for (JsonNode node : arr) {
                    String agent = node.path("agent").asText("").toLowerCase();
                    String text = node.path("text").asText("");
                    if (text.isBlank()) continue;
                    if (!agent.equals("backend") && !agent.equals("frontend") && !agent.equals("security")) {
                        agent = "backend";
                    }
                    Map<String, String> m = new HashMap<>();
                    m.put("agent", agent);
                    m.put("text", text);
                    out.add(m);
                }
            }
        } catch (Exception ignored) { }
        return out;
    }

    private List<Map<String, String>> fallbackMessages(String userMessage) {
        List<Map<String, String>> out = new ArrayList<>();
        out.add(Map.of("agent", "backend", "text",
            "Got it, boss. About \"" + userMessage + "\": I will implement it in the service and expose the endpoint."));
        out.add(Map.of("agent", "security", "text",
            "Hold on, before touching code let's review validation, hashing, and access control. 🔐"));
        out.add(Map.of("agent", "frontend", "text",
            "I will handle the UI flow and error messages. I need the response codes the API will return."));
        out.add(Map.of("agent", "backend", "text",
            "Perfect, I will share the contract as soon as I have it. (Demo response: configure OPENAI_API_KEY)"));
        return out;
    }
}
