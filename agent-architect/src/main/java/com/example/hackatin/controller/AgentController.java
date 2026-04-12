package com.example.hackatin.controller;

import com.example.hackatin.model.Agent;
import com.example.hackatin.model.ProjectConfig;
import com.example.hackatin.repository.AgentRepository;
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
import java.util.Optional;

@RestController
@RequestMapping("/api/agents")
public class AgentController {

    private final OpenAiService openAi;
    private final ProjectConfigRepository repository;
    private final AgentRepository agentRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public AgentController(OpenAiService openAi, ProjectConfigRepository repository, AgentRepository agentRepository) {
        this.openAi = openAi;
        this.repository = repository;
        this.agentRepository = agentRepository;
    }

    @PostMapping("/{projectId}/generate")
    public Map<String, Object> generateAgents(@PathVariable Long projectId) {
        Map<String, Object> response = new HashMap<>();
        ProjectConfig config = repository.findById(projectId).orElse(null);

        if (config == null || config.getAgentsJson() == null) {
            response.put("error", "Project configuration or agents not found");
            return response;
        }

        try {
            JsonNode agentsNode = mapper.readTree(config.getAgentsJson());
            List<String> generatedAgents = new ArrayList<>();

            if (agentsNode.isArray()) {
                // Delete existing agents for this project to recreate them
                agentRepository.deleteByProjectId(projectId);

                for (JsonNode agentNode : agentsNode) {
                    String name = agentNode.path("name").asText("").trim();
                    String role = agentNode.path("role").asText("").trim();
                    String stack = agentNode.path("stack").asText("").trim();
                    String description = agentNode.path("description").asText("").trim();
                    String personality = agentNode.path("personality").asText("").trim();
                    String instructions = agentNode.path("instructions").asText("").trim();
                    String instructionsSection = instructions.isBlank()
                        ? "No extra simulation instructions provided."
                        : instructions;

                                        String prompt = String.format("""
                                                        ---
                                                        name: %s
                                                        description: %s Use it when work involves %s inside project "%s".
                                                        ---

                                                        <!-- Agent Content Start -->
                                                        # %s

                                                        > %s
                                                        >
                                                        > Stack: **%s**

                                                        ## When to invoke this agent

                                                        Invoke **%s** when you need to design, implement, review, or optimize
                                                        any part of the system related to **%s**. This is the reference agent
                                                        for architectural decisions, performance troubleshooting,
                                                        code review, and quality standards in its territory.

                                                        Project context where this agent operates:
                                                        > %s

                                                        ### Usage examples

                                                        <example>
                                                        Context: the user needs to start a new feature within this agent's domain.
                                                        user: "I need to add [FEATURE RELEVANT TO %s]."
                                                        assistant: "I will invoke agent **%s** to design and implement the feature following project conventions and best practices for %s."
                                                        <commentary>
                                                        This request falls squarely in %s territory, so this agent should architect the solution, propose trade-offs, and deliver reviewable code.
                                                        </commentary>
                                                        </example>

                                                        <example>
                                                        Context: a technical, performance, or quality issue appears in this area.
                                                        user: "Something is wrong with [SYMPTOM: e.g. high latency, slow rendering, N+1 queries, huge bundle]."
                                                        assistant: "I will invoke agent **%s** to diagnose the root cause and propose a structured optimization."
                                                        <commentary>
                                                        Diagnosis and fine-tuning within %s are core responsibilities of this agent.
                                                        </commentary>
                                                        </example>

                                                        ## Identity

                                                        You are **%s**, an elite engineer with more than a decade of experience
                                                        building production systems on **%s**. You master the full ecosystem:
                                                        tools, design patterns, real-world trade-offs, and common pitfalls
                                                        of fast-growing projects. Your work stands out for clarity,
                                                        testability, and a strict respect for software engineering
                                                        principles.

                                                        You are not a generic code generator. You think before writing, justify
                                                        decisions, and explicitly state what you will NOT do when
                                                        worse alternatives exist.

                                                        ## Core responsibilities

                                                        Within project **"%s"**, your responsibilities are:

                                                        %s

                                                        ## Simulation instructions

                                                        %s

                                                        More specifically, whenever you act you must take care of:

                                                        - **Architecture:** structural design consistent with the rest of the system. Respect
                                                            other agents' domain boundaries; do not invade frontend if you are backend,
                                                            and vice versa.
                                                        - **Code quality:** intention-revealing names, small single-responsibility functions,
                                                            low cyclomatic complexity, composition over inheritance.
                                                        - **Performance:** identify your domain's critical resource (latency, memory,
                                                            queries, bundle size, rendering) and optimize with measurement, not intuition.
                                                        - **Security:** apply current standards (OWASP Top 10, least privilege,
                                                            validation at system boundaries). Never trust external input.
                                                        - **Testing:** accompany every non-trivial change with meaningful tests (unit,
                                                            integration, and when relevant, end-to-end). Tests that only exist to increase
                                                            coverage do not count.
                                                        - **Minimal but useful documentation:** comments only where the *why* is not
                                                            obvious. No filler docstrings.

                                                        ## Workflow

                                                        1. **Understand the requirement.** Clarify business goals and constraints
                                                             before touching a line of code. If critical information is missing, ask.
                                                        2. **Read existing code.** Respect and extend project conventions
                                                             unless they are clearly problematic (in that case, say it explicitly).
                                                        3. **Design before implementing.** For non-trivial changes, outline the approach:
                                                             affected parts, data flow, rejected alternatives, and why.
                                                        4. **Implement with quality.** Idiomatic, readable, testable code. Preferably
                                                             immutable. Explicit and consistent error handling.
                                                        5. **Self-review.** Before delivering, check: race conditions, malicious inputs,
                                                             edge cases, unwanted side effects, and regressions in other
                                                             areas.
                                                        6. **Explain trade-offs.** Justify each decision when alternatives existed.
                                                             A good agent does not hide decisions behind code.

                                                        ## Guiding principles

                                                        - **Simplicity over premature elegance.** Do not introduce abstractions that are not
                                                            justified by two or three real uses.
                                                        - **You work in a team.** Other agents cover other project areas; respect
                                                            their interfaces and consult before stepping into their territory.
                                                        - **Technical integrity.** If a user request conflicts with best practices,
                                                            explain it and propose a better alternative before obeying blindly.
                                                        - **Communication minimalism.** Exhaustive when needed, concise always.
                                                            No filler, empty politeness, or summaries of the obvious.
                                                        - **Concrete examples.** When explaining something complex, include a
                                                            real code snippet.

                                                        ## Communication style and personality

                                                        **Personality:** %s

                                                        This personality is your signature. Keep it consistent in all responses, but
                                                        without sacrificing technical clarity. Respond in the user's language (Spanish by
                                                        default). Do not use decorative emojis unless they match your personality.

                                                        ## Limits

                                                        - Do not make decisions outside your domain without consulting the corresponding agent.
                                                        - Do not introduce new dependencies without justification.
                                                        - Do not silence errors. If something fails, let it fail loudly in development.
                                                        - Do not generate placeholder code ("TODO: implement later") unless the
                                                            user explicitly requests it.
                                                        """,
                                                name,
                                                role,
                                                stack,
                                                config.getProjectIdea() == null ? "" : config.getProjectIdea(),
                                                name,
                                                role,
                                                stack,
                                                name,
                                                stack,
                                                config.getProjectIdea() == null ? "" : config.getProjectIdea(),
                                                stack,
                                                name,
                                                stack,
                                                stack,
                                                name,
                                                stack,
                                                name,
                                                stack,
                                                config.getProjectIdea() == null ? "" : config.getProjectIdea(),
                                                description,
                                                instructionsSection,
                                                personality
                                        );

                    Agent agent = new Agent();
                    agent.setProjectId(projectId);
                    agent.setName(name);
                    agent.setRole(role);
                    agent.setStack(stack);
                    agent.setDescription(description);
                    agent.setPersonality(personality);
                    agent.setMarkdownContent(prompt.trim());

                    agentRepository.save(agent);
                    generatedAgents.add(name);
                }
            }
            response.put("status", "success");
            response.put("generated", generatedAgents);
            
            // Update project status
            if ("configured".equals(config.getStatus())) {
                config.setStatus("generated");
                repository.save(config);
            }
        } catch (Exception e) {
            response.put("error", e.getMessage());
            e.printStackTrace();
        }

        return response;
    }

    @GetMapping("/{projectId}/detail")
    public Map<String, Object> getAgentMarkdown(@PathVariable Long projectId, @RequestParam String name) {
        Map<String, Object> response = new HashMap<>();
        List<Agent> agents = agentRepository.findByProjectId(projectId);
        
        Optional<Agent> agentOpt = agents.stream()
            .filter(a -> a.getName() != null && a.getName().trim().equalsIgnoreCase(name.trim()))
            .findFirst();

        if (agentOpt.isPresent()) {
            response.put("content", agentOpt.get().getMarkdownContent());
        } else {
            response.put("error", "File not found");
        }

        return response;
    }

    @GetMapping("/project/{projectId}")
    public Map<String, Object> getAgentsByProject(@PathVariable Long projectId) {
        Map<String, Object> response = new HashMap<>();
        ProjectConfig config = repository.findById(projectId).orElse(null);

        if (config == null) {
            response.put("error", "Project not found");
            return response;
        }

        List<Agent> agents = agentRepository.findByProjectId(projectId);
        List<Map<String, Object>> files = new ArrayList<>();

        for (Agent agent : agents) {
            Map<String, Object> file = new HashMap<>();
            String slug = agent.getName() == null ? ("agent-" + agent.getId())
                    : agent.getName().trim().toLowerCase()
                        .replaceAll("[^a-z0-9]+", "-")
                        .replaceAll("(^-|-$)", "");
            file.put("filename", slug + ".md");
            file.put("name", agent.getName());
            file.put("role", agent.getRole());
            file.put("stack", agent.getStack());
            file.put("description", agent.getDescription());
            file.put("personality", agent.getPersonality());
            file.put("content", agent.getMarkdownContent());
            files.add(file);
        }

        response.put("projectId", projectId);
        response.put("projectName", config.getProjectName());
        response.put("targetDirectory", ".claude/agents");
        response.put("count", files.size());
        response.put("agents", files);
        return response;
    }

    @GetMapping("/all")
    public List<Map<String, Object>> getAllAgents() {
        List<Map<String, Object>> allAgents = new ArrayList<>();
        List<ProjectConfig> projects = repository.findAllByOrderByUpdatedAtDesc();

        for (ProjectConfig proj : projects) {
            List<Agent> agents = agentRepository.findByProjectId(proj.getId());
            for (Agent agent : agents) {
                Map<String, Object> agentData = new HashMap<>();
                agentData.put("projectId", proj.getId());
                agentData.put("projectName", proj.getProjectName());
                agentData.put("role", agent.getRole().toLowerCase());
                agentData.put("name", agent.getName());
                agentData.put("stack", agent.getStack());
                agentData.put("description", agent.getDescription());
                agentData.put("personality", agent.getPersonality());
                allAgents.add(agentData);
            }
        }
        return allAgents;
    }
}
