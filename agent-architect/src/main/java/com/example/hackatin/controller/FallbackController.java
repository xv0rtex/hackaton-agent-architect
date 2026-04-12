package com.example.hackatin.controller;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.servlet.http.HttpServletRequest;

@Controller
public class FallbackController implements ErrorController {

    @RequestMapping(value = "/error", produces = MediaType.TEXT_HTML_VALUE)
    public String handleErrorHtml(HttpServletRequest request) {
        // Return to index.html for React Router to handle the route
        return "forward:/index.html";
    }
}
