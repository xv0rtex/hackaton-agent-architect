package com.example.hackatin.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Agent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long projectId;

    private String name;
    private String role;
    private String stack;

    @Lob
    @Column(name = "description", columnDefinition = "CLOB")
    private String description;

    @Lob
    @Column(name = "personality", columnDefinition = "CLOB")
    private String personality;

    @Lob
    @Column(name = "markdown_content", columnDefinition = "CLOB")
    private String markdownContent;

    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStack() { return stack; }
    public void setStack(String stack) { this.stack = stack; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPersonality() { return personality; }
    public void setPersonality(String personality) { this.personality = personality; }

    public String getMarkdownContent() { return markdownContent; }
    public void setMarkdownContent(String markdownContent) { this.markdownContent = markdownContent; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}