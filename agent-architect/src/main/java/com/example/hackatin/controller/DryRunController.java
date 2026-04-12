package com.example.hackatin.controller;

import com.example.hackatin.model.ProjectConfig;
import com.example.hackatin.repository.ProjectConfigRepository;
import com.example.hackatin.service.OpenAiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects/{projectId}/dry-run")
public class DryRunController {

    private static final String SESSION_PREFIX = "dryrun.conv.";

    private final OpenAiService openAi;
    private final ProjectConfigRepository repository;
    private final ObjectMapper mapper = new ObjectMapper();

    public DryRunController(OpenAiService openAi, ProjectConfigRepository repository) {
        this.openAi = openAi;
        this.repository = repository;
    }

    private String sessionKey(Long projectId) {
        return SESSION_PREFIX + projectId;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, String>> getConversation(HttpSession session, Long projectId, ProjectConfig project) {
        String key = sessionKey(projectId);
        List<Map<String, String>> conv = (List<Map<String, String>>) session.getAttribute(key);
        if (conv == null) {
            conv = new ArrayList<>();
            conv.add(Map.of("role", "system", "content", buildSystemPrompt(project)));
            session.setAttribute(key, conv);
        } else if (!conv.isEmpty() && "system".equals(conv.get(0).get("role"))) {
            conv.set(0, Map.of("role", "system", "content", buildSystemPrompt(project)));
        }
        return conv;
    }

    private String buildSystemPrompt(ProjectConfig project) {
        StringBuilder sb = new StringBuilder();
        sb.append("""
                                You are the engine for a simulation called "Dry Run" for a user-defined AI agent team.
                                The project owner (human) sends messages. Agents should debate in-character,
                                based on the brief exactly as shown below (only listed pieces: idea and/or stack that exist in this project)
                                and on what the user asks in each message. Tone: technical team chat, short and natural sentences,
                                in English. Agents may simulate task distribution and respectful disagreement.

                                Respond EXCLUSIVELY with valid JSON (no markdown) using this schema:
                {
                  "messages": [
                                        { "agent": "<exact name of one of the agents listed below>", "text": "..." }
                  ]
                }

                                Rules:
                                - Between 3 and 8 messages per user prompt.
                                - Each message must be from a single agent.
                                - The "agent" field must match EXACTLY an agent name from the list (same case).
                                - Do not include the human user in "messages".
                                - Do not use markdown in "text", plain text only.
                """);

        appendProjectBrief(sb, project);

        sb.append("\n## Team agents (preserve their voice based on personality)\n");
        if (project.getAgentsJson() == null || project.getAgentsJson().isBlank()) {
            sb.append("(No agents are defined yet — create a minimal generic dialogue between three roles: backend, frontend, security.)\n");
        } else {
            try {
                JsonNode arr = mapper.readTree(project.getAgentsJson());
                if (arr.isArray()) {
                    for (JsonNode node : arr) {
                        String name = node.path("name").asText("Agent");
                        String role = node.path("role").asText("specialist");
                        String stack = node.path("stack").asText("");
                        String personality = node.path("personality").asText("");
                        String description = node.path("description").asText("");
                        String instructions = node.path("instructions").asText("");
                        sb.append("\n- Name: ").append(name).append("\n");
                        sb.append("  Role: ").append(role).append("\n");
                        sb.append("  Stack: ").append(stack).append("\n");
                        sb.append("  Personality: ").append(personality).append("\n");
                        sb.append("  Responsibility: ").append(description).append("\n");
                        if (instructions != null && !instructions.isBlank()) {
                            sb.append("  Extra instructions (high priority in this simulation): ").append(instructions).append("\n");
                        }
                    }
                }
            } catch (Exception e) {
                sb.append("(Error reading agents — use generic backend/frontend/security roles in JSON with short names.)\n");
            }
        }

        return sb.toString();
    }

    private static String nz(String s) {
        return s == null || s.isBlank() ? "(not defined)" : s;
    }

    /**
     * Includes only stack/brief dimensions that are actually defined for this project
     * (does not force three categories when missing or empty).
     */
    private void appendProjectBrief(StringBuilder sb, ProjectConfig project) {
        sb.append("\n## Project brief\n");
        String idea = project.getProjectIdea();
        boolean hasIdea = idea != null && !idea.isBlank();

        if (hasIdea) {
            sb.append("Idea / scope: ").append(idea.trim()).append("\n");
        }

        appendIfValue(sb, "Backend", project.getBackend());
        appendIfValue(sb, "Frontend", project.getFrontend());
        appendIfValue(sb, "Database", project.getDatabase());

        boolean anyStack =
                hasText(project.getBackend()) || hasText(project.getFrontend()) || hasText(project.getDatabase());

        if (!hasIdea && !anyStack) {
            sb.append("(This project does not yet include idea or detailed stack in its record — agents may ask the user for clarification.)\n");
        } else if (hasIdea && !anyStack) {
            sb.append("(Technical stack is not specified yet in the record — infer carefully or ask the user.)\n");
        }
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private static void appendIfValue(StringBuilder sb, String label, String value) {
        if (!hasText(value)) {
            return;
        }
        sb.append(label).append(": ").append(value.trim()).append("\n");
    }

    @PostMapping("/message")
    public ResponseEntity<Map<String, Object>> message(
            @PathVariable Long projectId,
            @RequestBody Map<String, String> body,
            HttpSession session) {

        ProjectConfig project = repository.findById(projectId).orElse(null);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }

        String userMessage = body.getOrDefault("message", "").trim();
        if (userMessage.isEmpty()) {
            return ResponseEntity.ok(Map.of("messages", List.of()));
        }

        List<Map<String, String>> conv = getConversation(session, projectId, project);
        conv.add(Map.of("role", "user", "content", userMessage));

        String raw;
        try {
            raw = openAi.chat(conv, true);
        } catch (Exception e) {
            List<Map<String, String>> fallback = fallbackMessages(project, userMessage);
            Map<String, Object> err = new HashMap<>();
            err.put("messages", fallback);
            err.put("error", e.getMessage());
            return ResponseEntity.ok(err);
        }

        conv.add(Map.of("role", "assistant", "content", raw));

        List<Map<String, String>> parsed = parseMessages(raw, project);
        if (parsed.isEmpty()) {
            parsed = fallbackMessages(project, userMessage);
        }

        return ResponseEntity.ok(Map.of("messages", parsed));
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset(@PathVariable Long projectId, HttpSession session) {
        session.removeAttribute(sessionKey(projectId));
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    private List<Map<String, String>> parseMessages(String raw, ProjectConfig project) {
        List<Map<String, String>> out = new ArrayList<>();
        if (raw == null || raw.isBlank()) {
            return out;
        }
        List<String> validNames = agentNames(project);
        try {
            JsonNode root = mapper.readTree(raw);
            JsonNode arr = root.get("messages");
            if (arr != null && arr.isArray()) {
                for (JsonNode node : arr) {
                    String agent = node.path("agent").asText("").trim();
                    String text = node.path("text").asText("");
                    if (text.isBlank()) {
                        continue;
                    }
                    if (agent.isEmpty()) {
                        agent = validNames.isEmpty() ? "Team" : validNames.get(0);
                    }
                    Map<String, String> m = new HashMap<>();
                    m.put("agent", agent);
                    m.put("text", text);
                    out.add(m);
                }
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    private List<String> agentNames(ProjectConfig project) {
        List<String> names = new ArrayList<>();
        if (project.getAgentsJson() == null) {
            return names;
        }
        try {
            JsonNode arr = mapper.readTree(project.getAgentsJson());
            if (arr.isArray()) {
                for (JsonNode node : arr) {
                    String n = node.path("name").asText("").trim();
                    if (!n.isEmpty()) {
                        names.add(n);
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return names;
    }

    private List<Map<String, String>> fallbackMessages(ProjectConfig project, String userMessage) {
        List<String> names = agentNames(project);
        List<Map<String, String>> out = new ArrayList<>();
        String a0 = names.size() > 0 ? names.get(0) : "Backend";
        String a1 = names.size() > 1 ? names.get(1) : "Frontend";
        String a2 = names.size() > 2 ? names.get(2) : "Security";

        out.add(Map.of("agent", a0, "text",
            "Understood about \"" + shorten(userMessage, 80) + "\". I suggest tackling it in layers: API first, then a stable contract."));
        out.add(Map.of("agent", a1, "text",
            "I need loading and error states in the UI; if we define the endpoint payload, I can mock the full flow."));
        out.add(Map.of("agent", a2, "text",
            "Before coding: input validation, rate limiting, and traces without sensitive data. OK?"));
        out.add(Map.of("agent", a0, "text",
            "(Demo mode: configure OPENAI_API_KEY for a simulation with real responses from each agent.)"));
        return out;
    }

    private static String shorten(String s, int max) {
        if (s == null) {
            return "";
        }
        String t = s.trim();
        return t.length() <= max ? t : t.substring(0, max) + "…";
    }
}
