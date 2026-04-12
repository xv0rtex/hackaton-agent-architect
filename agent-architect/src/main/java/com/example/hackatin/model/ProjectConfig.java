package com.example.hackatin.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import java.time.Instant;

@Entity
public class ProjectConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sessionId;

    @Column(name = "project_name")
    private String projectName;

    @Column(name = "status")
    private String status = "draft"; // "draft" | "configured" | "generated"

    private String backend;
    private String frontend;
    private String database;

    @Lob
    @Column(name = "agents_json", columnDefinition = "CLOB")
    private String agentsJson;

    @Lob
    @Column(name = "project_idea", columnDefinition = "CLOB")
    private String projectIdea;

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getProjectName() { return projectName; }
    public void setProjectName(String projectName) { this.projectName = projectName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getBackend() { return backend; }
    public void setBackend(String backend) { this.backend = backend; }

    public String getFrontend() { return frontend; }
    public void setFrontend(String frontend) { this.frontend = frontend; }

    public String getDatabase() { return database; }
    public void setDatabase(String database) { this.database = database; }

    public String getAgentsJson() { return agentsJson; }
    public void setAgentsJson(String agentsJson) { this.agentsJson = agentsJson; }

    public String getProjectIdea() { return projectIdea; }
    public void setProjectIdea(String projectIdea) { this.projectIdea = projectIdea; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
