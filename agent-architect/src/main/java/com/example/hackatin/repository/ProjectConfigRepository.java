package com.example.hackatin.repository;

import com.example.hackatin.model.ProjectConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectConfigRepository extends JpaRepository<ProjectConfig, Long> {
    Optional<ProjectConfig> findBySessionId(String sessionId);
    List<ProjectConfig> findAllByOrderByUpdatedAtDesc();
    boolean existsByProjectName(String projectName);
}
