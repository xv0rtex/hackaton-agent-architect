package com.example.hackatin.controller;

import com.example.hackatin.model.ProjectConfig;
import com.example.hackatin.repository.ChatMessageRepository;
import com.example.hackatin.repository.ProjectConfigRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectConfigRepository repository;
    private final ChatMessageRepository chatRepository;

    public ProjectController(ProjectConfigRepository repository, ChatMessageRepository chatRepository) {
        this.repository = repository;
        this.chatRepository = chatRepository;
    }

    @GetMapping
    public List<ProjectConfig> getAllProjects() {
        return repository.findAllByOrderByUpdatedAtDesc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectConfig> getProject(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ProjectConfig createProject(@RequestBody Map<String, String> payload) {
        String baseName = payload.getOrDefault("projectName", "New Project");
        String name = baseName;
        int counter = 1;

        // Force unique name
        while (repository.existsByProjectName(name)) {
            name = baseName + " (" + counter + ")";
            counter++;
        }

        String idea = payload.get("projectIdea");

        ProjectConfig config = new ProjectConfig();
        config.setProjectName(name);
        config.setProjectIdea(idea);
        config.setStatus("draft");
        config.setCreatedAt(Instant.now());
        config.setUpdatedAt(Instant.now());

        return repository.save(config);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        chatRepository.deleteByProjectId(id);
        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Partial update (e.g. agentsJson after Dry Run personality / instructions edits).
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ProjectConfig> patchProject(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<ProjectConfig> opt = repository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ProjectConfig cfg = opt.get();
        if (body.containsKey("agentsJson") && body.get("agentsJson") instanceof String json) {
            cfg.setAgentsJson(json);
            cfg.setUpdatedAt(Instant.now());
            repository.save(cfg);
        }
        return ResponseEntity.ok(cfg);
    }
}
