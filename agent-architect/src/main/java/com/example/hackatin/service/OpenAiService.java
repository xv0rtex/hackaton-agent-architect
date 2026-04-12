package com.example.hackatin.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OpenAiService {

    @Value("${openai.api.key:}")
    private String apiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String model;

    @Value("${openai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String chat(List<Map<String, String>> messages) throws Exception {
        return chat(messages, false);
    }

    public String chat(List<Map<String, String>> messages, boolean jsonMode) throws Exception {
        if (!isConfigured()) {
            return fallbackReply(messages);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("temperature", 0.7);
        if (jsonMode) {
            body.put("response_format", Map.of("type", "json_object"));
        }

        String json = mapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/chat/completions"))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 300) {
            throw new RuntimeException("OpenAI error " + response.statusCode() + ": " + response.body());
        }

        JsonNode node = mapper.readTree(response.body());
        return node.at("/choices/0/message/content").asText();
    }

    public String transcribeAudio(byte[] audioBytes, String filename) throws Exception {
        if (!isConfigured()) {
            return "Demo mode: audio received, but you need to configure OPENAI_API_KEY for transcription.";
        }
        
        String boundary = "----WebKitFormBoundary" + System.currentTimeMillis();
        
        StringBuilder bodyBuilder = new StringBuilder();
        bodyBuilder.append("--").append(boundary).append("\r\n");
        bodyBuilder.append("Content-Disposition: form-data; name=\"file\"; filename=\"").append(filename).append("\"\r\n");
        bodyBuilder.append("Content-Type: audio/webm\r\n\r\n");
        
        byte[] headerBytes = bodyBuilder.toString().getBytes("UTF-8");
        
        String footer = "\r\n--" + boundary + "\r\n" +
                "Content-Disposition: form-data; name=\"model\"\r\n\r\n" +
                "whisper-1\r\n" +
                "--" + boundary + "--\r\n";
        byte[] footerBytes = footer.getBytes("UTF-8");
        
        byte[] body = new byte[headerBytes.length + audioBytes.length + footerBytes.length];
        System.arraycopy(headerBytes, 0, body, 0, headerBytes.length);
        System.arraycopy(audioBytes, 0, body, headerBytes.length, audioBytes.length);
        System.arraycopy(footerBytes, 0, body, headerBytes.length + audioBytes.length, footerBytes.length);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/audio/transcriptions"))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 300) {
            throw new RuntimeException("OpenAI error " + response.statusCode() + ": " + response.body());
        }

        JsonNode node = mapper.readTree(response.body());
        return node.at("/text").asText();
    }

    public byte[] generateSpeech(String text) throws Exception {
        if (!isConfigured()) {
            return new byte[0];
        }

        Map<String, Object> body = new HashMap<>();
        body.put("model", "tts-1");
        body.put("input", text);
        body.put("voice", "alloy");
        body.put("speed", 1.25); // Slightly faster speed (1.0 default, max 4.0)

        String json = mapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/audio/speech"))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

        if (response.statusCode() >= 300) {
            throw new RuntimeException("OpenAI error " + response.statusCode() + ": " + new String(response.body()));
        }

        return response.body();
    }

    private String fallbackReply(List<Map<String, String>> messages) {
        String last = messages.isEmpty() ? "" : messages.get(messages.size() - 1).getOrDefault("content", "");
        return "[Demo mode: configure OPENAI_API_KEY for real responses]\n" +
            "You said: \"" + last + "\". Tell me which technologies you want for backend, frontend, and database.";
    }
}
