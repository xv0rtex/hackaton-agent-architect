package com.example.hackatin.controller;

import com.example.hackatin.model.ProjectConfig;
import com.example.hackatin.repository.ProjectConfigRepository;
import com.example.hackatin.model.ChatMessage;
import com.example.hackatin.repository.ChatMessageRepository;
import com.example.hackatin.service.OpenAiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat/{projectId}")
public class ChatController {

    private static final String CONV_ATTR = "chat.conversation";
    private static final String ENGLISH_GREETING = "Hi! I am Neural Architect 🚀. I will help you define your project and the team of agents that will build it. To start: what application do you want to build, and which frameworks or technologies would you like to use? If you are not sure, I can recommend the best options for your idea.";

    private static final String SYSTEM_PROMPT = """
                        You are **Neural Architect**, a senior software architect specialized in turning vague ideas
                        into executable projects and designing AI agent teams to build them.
                        You speak like a tech lead: close, direct, and opinionated. Never condescending, never robotic.

                        ## Mission
                        Interview the user to (a) understand what they want to build, (b) agree on a sensible
                        technical stack, and (c) finish with a JSON that defines the agent team that will build the project.

                        ## How to drive the conversation
                        - **One question at a time.** No 5-question questionnaires in a single message.
                        - **Active listening:** summarize in one sentence what you understood before the next question,
                            only when it adds value. Do not repeat the user robotically.
                        - **Recommend with judgment.** If the user is unsure, propose one concrete stack and justify it
                            in one line ("React + Spring Boot + PostgreSQL because the domain is CRUD with auth and you will
                            need transactions"). Do not give three vague options: choose one and defend it.
                        - **Respect informed users.** If they already chose their stack, do not challenge it unless there is
                            an objective technical error (e.g., "MongoDB for strongly relational financial data").
                        - **No filler.** No "Great idea!", "Awesome!", decorative emojis,
                            or empty courtesy phrases. Be concise.
            - **Language:** always respond in English.

                        ## What you must discover before closing
                        1. **What is being built** (application type, users, real problem it solves).
                        2. **Core functionalities** (3-6 key features, not the entire backlog).
                        3. **Stack** backend, frontend, and database. If one is not needed, mark it `N/A`.
                        4. **Relevant constraints** (timeline, deployment, external integrations, compliance).

                        You do not need to ask everything in rigid order. Ask what is missing based on what the user
                        already shared. Three or four turns should be enough for a typical hackathon project.

                        ## Closing and confirmation
                        When you have enough information:
                        1. Explicitly propose closing ("Shall we lock this stack and generate your agent team?").
                        2. Wait for user confirmation ("yes", "go ahead", "ok", "generate").
                        3. In the response that contains confirmation, include the literal `[CONFIRMADO]` and the final
                             summary in that same response.

                        ## Final output format (MANDATORY: USE [RESUMEN] TAGS)
                        NEVER return pure JSON as the response. Show the block wrapped with [RESUMEN] and [/RESUMEN], using plain text for idea, backend, frontend, and database, and inject a valid JSON array in "agents:". Required structure:

            [RESUMEN]
                idea: 2-3 sentences describing what the system does, for whom, and what its unique value is.
                backend: Language + concrete framework (e.g. 'Java 21 + Spring Boot 3') or 'N/A'
                frontend: Framework + language (e.g. 'React 18 + TypeScript + Vite') or 'N/A'
                database: Engine + short justification (e.g. 'PostgreSQL 16') or 'N/A'
            agents: [
              {
                     "id": "unique-kebab-case",
                     "title": "Short, memorable proper name with character (e.g. 'Atlas', 'Pixel', 'Cipher', 'Luna').",
                     "role": "backend, frontend, database, devops, ux, qa, or security",
                     "description": "One precise sentence: what this agent builds and what it must NOT do.",
                     "instructions": "At least 8 sentences. Technologies and architecture under its ownership, responsibility boundaries, and tasks.",
                     "personality": "Vivid description of tone and speaking style. Example: 'Security-obsessed, poetic, brutally direct'."
              }
            ]
            [/RESUMEN]

                ## Rules for the agent team
                - **Between 3 and 6 agents.** Less is trivial, more is chaos for a hackathon.
                - **No monolithic agents.** No "Fullstack Developer". Split by real responsibility.
                - **Minimum coverage** for a web project: one frontend, one backend/API, one data/persistence.
                - **Add specialists when valuable:** QA/Testing, Security, DevOps, Prompt Engineering
                  (if the product has AI), UI/UX when design is critical.
                - **Distinct personalities.** If two agents sound the same, one is redundant or needs differentiation.
            """;

    private static final String BUILD_PROMPT = """
                ### ROLE
                You are a senior AI Systems Architect specialized in **multi-agent orchestration**.
                Your job is to transform a conversation and an agreed stack into a team of
                autonomous, specialized agents with distinguishable personalities, ready to build the
                project in Claude Code.

                ### OBJECTIVE
                Analyze the conversation and return EXCLUSIVELY valid JSON with the agent team.
                No prose before or after. No markdown. No comments.

                ### RULES
                1. **Stack fidelity.** Use exactly the agreed technologies. Do not substitute.
                2. **No monolithic agents.** If a role spans more than one discipline, split it.
                3. **Between 3 and 6 agents.** Less is trivial, more is unmanageable.
                4. **Actionable instructions.** Each `instructions` must have 8-15 sentences and mention
                    concrete technologies and versions, architectural patterns, quality standards
                    (tests, security, performance), and boundaries with other agents. It is forbidden
                    to write "will handle backend" or vague equivalents.
                5. **Proactivity.** If the user did not mention security, testing, or documentation but
                    the project needs them, add agents or instructions that cover them.
                6. **Unique personalities.** Each agent must speak differently. If two personalities
                    are interchangeable, one is wrong.
                7. **Proper names.** Short, memorable, with character (Atlas, Pixel, Cipher, Luna,
                    Forge, Vesper, Nova). No "Backend Agent 1".

                ### TEAM COMPOSITION LOGIC
                - Web project with persistence -> Frontend + Backend/API + Data (minimum).
                - Product with AI -> add Prompt Engineer or Data/ML.
                - System with authentication, payments, or sensitive data -> add Security.
                - High criticality or many endpoints -> add QA/Testing.
                - Differentiated UI -> add UI/UX Designer.
                - Complex deployment -> add DevOps.

                ### OUTPUT FORMAT (strict JSON)
            {
                  "project_summary": "2-3 sentences: what the system does, for whom, and unique value.",
                  "backend": "Language + framework + version, or 'N/A'",
                  "frontend": "Framework + language + version, or 'N/A'",
                  "database": "Engine + version, or 'N/A'",
              "agents": [
                {
                        "id": "unique-kebab-case",
                        "title": "Short and memorable proper name",
                        "role": "One sentence with the exact territory of the agent.",
                        "instructions": "Long block (8-15 sentences) with concrete responsibilities, technologies, patterns, quality, boundaries, and deliverables.",
                        "personality": "Unique tone and speaking style, with a clear mental image."
                }
              ]
            }
            """;

    private final OpenAiService openAi;
    private final ProjectConfigRepository projectRepository;
    private final ChatMessageRepository chatRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public ChatController(OpenAiService openAi, ProjectConfigRepository projectRepository, ChatMessageRepository chatRepository) {
        this.openAi = openAi;
        this.projectRepository = projectRepository;
        this.chatRepository = chatRepository;
    }

    @GetMapping("/history")
    public ResponseEntity<List<Map<String, String>>> getHistory(@PathVariable Long projectId) {
        if (!projectRepository.existsById(projectId)) {
            return ResponseEntity.notFound().build();
        }

        List<ChatMessage> messages = chatRepository.findByProjectIdOrderByCreatedAtAsc(projectId);

        // If empty history, we might want to return an initial greeting
        if (messages.isEmpty()) {
            return ResponseEntity.ok(List.of(
                Map.of("role", "assistant", "content", ENGLISH_GREETING)
            ));
        }

        // One-time migration for legacy Spanish first assistant greeting in existing histories.
        ChatMessage first = messages.get(0);
        if ("assistant".equals(first.getRole()) && isLegacySpanishGreeting(first.getContent())) {
            first.setContent(ENGLISH_GREETING);
            chatRepository.save(first);
        }

        List<Map<String, String>> result = messages.stream()
                .map(m -> Map.of("role", m.getRole(), "content", m.getContent()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/message")
    public ResponseEntity<Map<String, Object>> message(@PathVariable Long projectId, @RequestBody Map<String, String> body) throws Exception {
        return processMessage(projectId, body.getOrDefault("message", "").trim());
    }

    @PostMapping("/voice")
    public ResponseEntity<Map<String, Object>> voiceMessage(@PathVariable Long projectId, @RequestParam("file") MultipartFile file) throws Exception {
        String userMessageStr = openAi.transcribeAudio(file.getBytes(), file.getOriginalFilename());
        ResponseEntity<Map<String, Object>> response = processMessage(projectId, userMessageStr);
        
        Map<String, Object> result = new HashMap<>(response.getBody());
        result.put("transcribedText", userMessageStr);
        
        String replyText = (String) result.get("reply");
        if (replyText != null && !replyText.isEmpty()) {
            byte[] audioBytes = openAi.generateSpeech(replyText);
            if (audioBytes.length > 0) {
                result.put("audioBase64", Base64.getEncoder().encodeToString(audioBytes));
            }
        }
        
        return ResponseEntity.ok(result);
    }

    private ResponseEntity<Map<String, Object>> processMessage(Long projectId, String userMessageStr) throws Exception {
        Optional<ProjectConfig> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ProjectConfig project = projectOpt.get();

        List<ChatMessage> dbMessages = chatRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        List<Map<String, String>> apiMessages = new ArrayList<>();

        // Always inject system prompt first
        apiMessages.add(Map.of("role", "system", "content", SYSTEM_PROMPT));

        // Add existing history
        for (ChatMessage msg : dbMessages) {
            String content = msg.getContent();
            if ("assistant".equals(msg.getRole()) && isLegacySpanishGreeting(content)) {
                content = ENGLISH_GREETING;
                msg.setContent(content);
                chatRepository.save(msg);
            }
            apiMessages.add(Map.of("role", msg.getRole(), "content", content));
        }

        // Add new user message
        if (!userMessageStr.isEmpty()) {
            apiMessages.add(Map.of("role", "user", "content", userMessageStr));

            ChatMessage userMsg = new ChatMessage();
            userMsg.setProjectId(projectId);
            userMsg.setRole("user");
            userMsg.setContent(userMessageStr);
            chatRepository.save(userMsg);

            // Auto-update project idea if not set yet based on first few exchanges
            if (project.getProjectIdea() == null || project.getProjectIdea().isEmpty() || project.getProjectIdea().equals("New Project")) {
                project.setProjectIdea(userMessageStr);
                projectRepository.save(project);
            }
        }

        // Ask OpenAI
        String reply = openAi.chat(apiMessages);

        // Save assistant reply
        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setProjectId(projectId);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(reply);
        chatRepository.save(assistantMsg);

        Map<String, Object> result = new HashMap<>();
        result.put("reply", reply);

        // Check if there's a [RESUMEN] pending confirmation
        Map<String, Object> parsed = parseSummary(reply);
        if (parsed != null) {
            result.put("pendingConfig", parsed);
        }

        // Check if user confirmed
        if (reply.contains("[CONFIRMADO]")) {
            ProjectConfig saved = findLatestConfirmed(projectId);
            if (saved != null) {
                result.put("saved", toMap(saved));
            }
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/confirm")
    public ResponseEntity<Map<String, Object>> confirm(@PathVariable Long projectId, @RequestBody Map<String, Object> body) {
        Optional<ProjectConfig> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ProjectConfig cfg = projectOpt.get();

        String backend = String.valueOf(body.getOrDefault("backend", "")).trim();
        String frontend = String.valueOf(body.getOrDefault("frontend", "")).trim();
        String database = String.valueOf(body.getOrDefault("database", "")).trim();

        if (backend.isEmpty() || frontend.isEmpty() || database.isEmpty()) {
            throw new IllegalArgumentException("backend, frontend, and database are required");
        }

        cfg.setBackend(backend);
        cfg.setFrontend(frontend);
        cfg.setDatabase(database);
        cfg.setStatus("configured");

        Object idea = body.get("idea");
        if (idea != null && !String.valueOf(idea).isEmpty()) {
            cfg.setProjectIdea(String.valueOf(idea));
            // Only update name if it's the default
            if (cfg.getProjectName() == null || cfg.getProjectName().startsWith("Project ")) {
                String baseName = String.valueOf(idea);
                String uniqueName = baseName;
                int counter = 1;
                while (projectRepository.existsByProjectName(uniqueName)) {
                    uniqueName = baseName + " (" + counter + ")";
                    counter++;
                }
                cfg.setProjectName(uniqueName);
            }
        }

        Object agents = body.get("agents");
        if (agents != null) {
            try {
                cfg.setAgentsJson(mapper.writeValueAsString(agents));
            } catch (Exception ignored) { }
        }

        cfg.setUpdatedAt(Instant.now());
        if (cfg.getCreatedAt() == null) cfg.setCreatedAt(Instant.now());
        return ResponseEntity.ok(toMap(projectRepository.save(cfg)));
    }

    @GetMapping("/config")
    public Map<String, Object> config(@PathVariable Long projectId) {
        return projectRepository.findById(projectId)
                .map(this::toMap)
                .orElseGet(HashMap::new);
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset(@PathVariable Long projectId) {
        chatRepository.deleteByProjectId(projectId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    private ProjectConfig findLatestConfirmed(Long projectId) {
        List<ChatMessage> msgs = chatRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        for (int i = msgs.size() - 1; i >= 0; i--) {
            ChatMessage m = msgs.get(i);
            if ("assistant".equals(m.getRole())) {
                Map<String, Object> parsed = parseSummary(m.getContent());
                if (parsed != null) {
                    ProjectConfig cfg = projectRepository.findById(projectId).orElseThrow();
                    cfg.setBackend((String) parsed.get("backend"));
                    cfg.setFrontend((String) parsed.get("frontend"));
                    cfg.setDatabase((String) parsed.get("database"));
                    cfg.setStatus("configured");

                    String idea = (String) parsed.get("idea");
                    if (idea != null && !idea.isEmpty()) {
                        cfg.setProjectIdea(idea);
                        if (cfg.getProjectName() == null || cfg.getProjectName().equals("New Project")) {
                            cfg.setProjectName(idea);
                        }
                    }

                    Object agents = parsed.get("agents");
                    if (agents != null) {
                        try {
                            cfg.setAgentsJson(mapper.writeValueAsString(agents));
                        } catch (Exception ignored) { }
                    }
                    cfg.setUpdatedAt(Instant.now());
                    return projectRepository.save(cfg);
                }
            }
        }
        return null;
    }

    private Map<String, Object> parseSummary(String text) {
        if (text == null) return null;

        Map<String, Object> result = new HashMap<>();

        // Try the [RESUMEN] format
        int startRes = text.indexOf("[RESUMEN]");
        int endRes = text.lastIndexOf("[/RESUMEN]");

        String jsonStr = extractJsonFromText(text);

        if (startRes != -1 && endRes != -1 && startRes < endRes) {
            String block = text.substring(startRes + 9, endRes);
            
            result.put("idea", extractField(block, "idea:"));
            result.put("backend", extractField(block, "backend:"));
            result.put("frontend", extractField(block, "frontend:"));
            result.put("database", extractField(block, "database:"));

            int agentsIdx = block.toLowerCase().indexOf("agents:");
            if (agentsIdx != -1) {
                int arrayStart = block.indexOf("[", agentsIdx);
                int arrayEnd = block.lastIndexOf("]");
                if (arrayStart != -1 && arrayEnd != -1 && arrayStart < arrayEnd) {
                    String arrayJson = block.substring(arrayStart, arrayEnd + 1);
                    try {
                        JsonNode agentsNode = mapper.readTree(arrayJson);
                        if (agentsNode.isArray()) {
                            List<Map<String, String>> agentsList = new ArrayList<>();
                            for (JsonNode node : agentsNode) {
                                Map<String, String> a = new HashMap<>();
                                a.put("role", node.path("role").asText("backend").toLowerCase());
                                String title = node.path("title").asText("");
                                if (title.isEmpty()) title = node.path("name").asText("");
                                a.put("name", title);
                                
                                String specificStack = computeAgentStack(
                                    a.get("role"),
                                    (String)result.get("backend"),
                                    (String)result.get("frontend"),
                                    (String)result.get("database")
                                );
                                a.put("stack", specificStack);

                                a.put("description", node.path("instructions").asText(""));
                                a.put("personality", node.path("personality").asText("Profesional y directo"));
                                agentsList.add(a);
                            }
                            result.put("agents", agentsList);
                            return result;
                        }
                    } catch (Exception ignored) { }
                }
            }
        }

        // Fallback to pure JSON if present
        if (jsonStr != null) {
            try {
                JsonNode root = mapper.readTree(jsonStr);
                if (root.has("project_summary") && root.has("agents")) {
                    result.put("idea", root.path("project_summary").asText(""));
                    result.put("backend", root.path("backend").asText("N/A"));
                    result.put("frontend", root.path("frontend").asText("N/A"));
                    result.put("database", root.path("database").asText("N/A"));

                    List<Map<String, String>> agentsList = new ArrayList<>();
                    JsonNode agentsNode = root.path("agents");
                    if (agentsNode.isArray()) {
                        for (JsonNode node : agentsNode) {
                            Map<String, String> a = new HashMap<>();
                            a.put("role", node.path("role").asText("backend").toLowerCase());
                            String title = node.path("title").asText("");
                            if (title.isEmpty()) title = node.path("name").asText("");
                            a.put("name", title);

                            String specificStack = computeAgentStack(
                                a.get("role"),
                                (String)result.get("backend"),
                                (String)result.get("frontend"),
                                (String)result.get("database")
                            );
                            a.put("stack", specificStack);

                            a.put("description", node.path("instructions").asText(""));
                            a.put("personality", node.path("personality").asText("Profesional y directo"));
                            agentsList.add(a);
                        }
                    }
                    result.put("agents", agentsList);
                    return result;
                }
            } catch (Exception ignored) { }
        }

        return null;
    }

    private String computeAgentStack(String role, String backend, String frontend, String database) {
        String lowerRole = role.toLowerCase();
        if (lowerRole.contains("frontend") || lowerRole.contains("ui") || lowerRole.contains("ux")) {
            return frontend + " (Primary), Back: " + backend;
        } else if (lowerRole.contains("backend") || lowerRole.contains("api") || lowerRole.contains("logic")) {
            return backend + " (Primary), DB: " + database;
        } else if (lowerRole.contains("db") || lowerRole.contains("data") || lowerRole.contains("schema")) {
            return database + " (Primary), Back: " + backend;
        } else {
            return backend + ", " + frontend + ", " + database;
        }
    }

    private String extractField(String text, String field) {
        String lowerText = text.toLowerCase();
        String lowerField = field.toLowerCase();
        int idx = lowerText.indexOf(lowerField);
        if (idx == -1) return "N/A";
        int start = idx + lowerField.length();
        int end = text.indexOf('\n', start);
        if (end == -1) end = text.length();
        return text.substring(start, end).replace("**", "").replace("*", "").trim();
    }

    private String extractJsonFromText(String text) {
        if (text == null) return null;
        int start = text.indexOf("{");
        int end = text.lastIndexOf("}");
        if (start != -1 && end != -1 && start < end) {
            return text.substring(start, end + 1);
        }
        return null;
    }

    private Map<String, Object> toMap(ProjectConfig cfg) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", cfg.getId());
        m.put("sessionId", cfg.getSessionId());
        m.put("idea", cfg.getProjectIdea());
        m.put("backend", cfg.getBackend());
        m.put("frontend", cfg.getFrontend());
        m.put("database", cfg.getDatabase());
        m.put("createdAt", cfg.getCreatedAt());
        m.put("updatedAt", cfg.getUpdatedAt());

        List<Map<String, String>> agents = new ArrayList<>();
        if (cfg.getAgentsJson() != null && !cfg.getAgentsJson().isBlank()) {
            try {
                JsonNode arr = mapper.readTree(cfg.getAgentsJson());
                if (arr.isArray()) {
                    for (JsonNode node : arr) {
                        Map<String, String> a = new HashMap<>();
                        a.put("role", node.path("role").asText("backend"));
                        a.put("name", node.path("name").asText(""));
                        a.put("stack", node.path("stack").asText(""));
                        a.put("description", node.path("description").asText(""));
                        a.put("personality", node.path("personality").asText(""));
                        agents.add(a);
                    }
                }
            } catch (Exception ignored) { }
        }
        m.put("agents", agents);
        return m;
    }

    private boolean isLegacySpanishGreeting(String text) {
        if (text == null) return false;
        String t = text.toLowerCase();
        return t.contains("hola")
                && t.contains("neural architect")
                && (t.contains("voy a ayudarte") || t.contains("cuéntame") || t.contains("cuentame"));
    }
}
