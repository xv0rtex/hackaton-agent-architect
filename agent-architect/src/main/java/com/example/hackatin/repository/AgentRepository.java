package com.example.hackatin.repository;

import com.example.hackatin.model.Agent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgentRepository extends JpaRepository<Agent, Long> {
    List<Agent> findByProjectId(Long projectId);
    Optional<Agent> findByProjectIdAndName(Long projectId, String name);

    @Transactional
    void deleteByProjectId(Long projectId);
}