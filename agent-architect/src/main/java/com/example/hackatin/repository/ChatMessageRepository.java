package com.example.hackatin.repository;

import com.example.hackatin.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByProjectIdOrderByCreatedAtAsc(Long projectId);

    @Transactional
    void deleteByProjectId(Long projectId);
}
