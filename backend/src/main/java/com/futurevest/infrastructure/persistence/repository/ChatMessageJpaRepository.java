package com.futurevest.infrastructure.persistence.repository;

import com.futurevest.infrastructure.persistence.entity.ChatMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ChatMessageJpaRepository extends JpaRepository<ChatMessageEntity, UUID> {

    List<ChatMessageEntity> findBySender_IdOrderByTimestampAsc(UUID senderId);

    List<ChatMessageEntity> findByReceiver_IdOrderByTimestampAsc(UUID receiverId);

    /**
     * Chats where the user is either sender or receiver (conversation threads).
     */
    @Query("SELECT c FROM ChatMessageEntity c WHERE c.sender.id = :userId OR c.receiver.id = :userId ORDER BY c.timestamp DESC")
    List<ChatMessageEntity> findChatsByUserId(UUID userId);

    List<ChatMessageEntity> findBySender_IdAndReceiver_IdOrderByTimestampAsc(UUID senderId, UUID receiverId);
}
