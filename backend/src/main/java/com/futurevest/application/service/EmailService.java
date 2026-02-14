package com.futurevest.application.service;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final SendGrid sendGrid;

    @Value("${sendgrid.from-email:noreply@futurevest.com}")
    private String fromEmail;

    @Value("${sendgrid.from-name:FutureVest}")
    private String fromName;

    @Async
    public CompletableFuture<Void> sendEmail(String toEmail, String subject, String message) {
        try {
            log.info("Sending email to: {} with subject: {}", toEmail, subject);
            
            Email from = new Email(fromEmail, fromName);
            Email to = new Email(toEmail);
            Content content = new Content("text/plain", message);
            Mail mail = new Mail(from, subject, to, content);

            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            Response response = sendGrid.api(request);
            
            if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                log.info("Email sent successfully to: {} with status: {}", toEmail, response.getStatusCode());
            } else {
                log.error("Failed to send email to: {}. Status: {}, Body: {}", 
                        toEmail, response.getStatusCode(), response.getBody());
            }
            
        } catch (IOException e) {
            log.error("Error sending email to: {}", toEmail, e);
        }
        
        return CompletableFuture.completedFuture(null);
    }

    @Async
    public CompletableFuture<Void> sendHtmlEmail(String toEmail, String subject, String htmlMessage) {
        try {
            log.info("Sending HTML email to: {} with subject: {}", toEmail, subject);
            
            Email from = new Email(fromEmail, fromName);
            Email to = new Email(toEmail);
            Content content = new Content("text/html", htmlMessage);
            Mail mail = new Mail(from, subject, to, content);

            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            Response response = sendGrid.api(request);
            
            if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                log.info("HTML email sent successfully to: {} with status: {}", toEmail, response.getStatusCode());
            } else {
                log.error("Failed to send HTML email to: {}. Status: {}, Body: {}", 
                        toEmail, response.getStatusCode(), response.getBody());
            }
            
        } catch (IOException e) {
            log.error("Error sending HTML email to: {}", toEmail, e);
        }
        
        return CompletableFuture.completedFuture(null);
    }

    @Async
    public CompletableFuture<Void> sendWelcomeEmail(String toEmail, String userName) {
        String subject = "Welcome to FutureVest!";
        String message = String.format(
            "Dear %s,\n\n" +
            "Welcome to FutureVest! We're excited to have you join our community.\n\n" +
            "FutureVest connects talented individuals with investors who believe in their potential.\n" +
            "You can now:\n" +
            "- Browse available courses\n" +
            "- Connect with investors\n" +
            "- Apply for funding\n\n" +
            "If you have any questions, feel free to reach out to our support team.\n\n" +
            "Best regards,\n" +
            "The FutureVest Team",
            userName
        );
        
        return sendEmail(toEmail, subject, message);
    }

    @Async
    public CompletableFuture<Void> sendInvestorWelcomeEmail(String toEmail, String investorName) {
        String subject = "Welcome to FutureVest - Investor Account";
        String message = String.format(
            "Dear %s,\n\n" +
            "Welcome to FutureVest! Your investor account has been successfully created.\n\n" +
            "As an investor, you can:\n" +
            "- Browse investment opportunities\n" +
            "- Connect with talented individuals\n" +
            "- Track your investments and repayments\n" +
            "- Communicate with your investees\n\n" +
            "Our team will review your verification documents and activate your account shortly.\n\n" +
            "Thank you for choosing FutureVest to invest in the future of talent.\n\n" +
            "Best regards,\n" +
            "The FutureVest Team",
            investorName
        );
        
        return sendEmail(toEmail, subject, message);
    }

    @Async
    public CompletableFuture<Void> sendPaymentConfirmationEmail(String toEmail, String userName, 
                                                              String courseName, String amount) {
        String subject = "Payment Confirmation - FutureVest";
        String message = String.format(
            "Dear %s,\n\n" +
            "Your payment for %s has been successfully processed.\n\n" +
            "Payment Details:\n" +
            "- Course: %s\n" +
            "- Amount: %s\n" +
            "- Date: %s\n\n" +
            "You can now access your course materials and connect with your investor.\n\n" +
            "Best regards,\n" +
            "The FutureVest Team",
            userName, courseName, courseName, amount, 
            java.time.Instant.now().toString()
        );
        
        return sendEmail(toEmail, subject, message);
    }

    @Async
    public CompletableFuture<Void> sendInvestmentNotificationEmail(String toEmail, String investorName, 
                                                                 String userName, String courseName, String amount) {
        String subject = "New Investment Opportunity - FutureVest";
        String message = String.format(
            "Dear %s,\n\n" +
            "Great news! %s has successfully enrolled in %s with your investment.\n\n" +
            "Investment Details:\n" +
            "- User: %s\n" +
            "- Course: %s\n" +
            "- Investment Amount: %s\n" +
            "- Date: %s\n\n" +
            "You can now connect with %s through our chat system to provide guidance and support.\n\n" +
            "Thank you for investing in future talent!\n\n" +
            "Best regards,\n" +
            "The FutureVest Team",
            investorName, userName, courseName, userName, courseName, amount, 
            java.time.Instant.now().toString(), userName
        );
        
        return sendEmail(toEmail, subject, message);
    }
}
