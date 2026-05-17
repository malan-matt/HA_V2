<?php
/**
 * Student Name: [Your Name]
 * Student Number: [Your Number]
 * Course: COS 216
 * Assignment: Homework Assignment - Flight Tracking System
 */

header('Content-Type: application/json');

// Wheatley already sends Access-Control-Allow-Origin (and related headers).
// Do NOT duplicate them here — browsers reject "*, *" as invalid CORS.

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'u25009801');
define('DB_PASS', getenv('DB_PASS') ?: 'VYZ3YJB4JICOP4EWDPCWP4KT7XABDNJJ');
define('DB_NAME', getenv('DB_NAME') ?: 'u25009801_HA');
define('SERVER_API_KEY', getenv('SERVER_API_KEY') ?: 'SUPERSECUREAPIKEY');

function getDBConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed']);
        exit();
    }
    return $conn;
}

function getAppBearerToken() {
    $headers = getallheaders();
    $appAuth = $headers['X-App-Authorization'] ?? $headers['x-app-authorization'] ?? '';
    if (str_starts_with($appAuth, 'Bearer ')) {
        return substr($appAuth, 7);
    }
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (str_starts_with($authHeader, 'Bearer ')) {
        return substr($authHeader, 7);
    }
    return '';
}

function verifyAuth() {
    $token = getAppBearerToken();

    if (empty($token)) {
        http_response_code(401);
        echo json_encode(['error' => 'No authentication token provided']);
        exit();
    }

    $conn = getDBConnection();
    $stmt = $conn->prepare('SELECT id, username, type FROM users WHERE api_key = ?');
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid authentication token']);
        exit();
    }

    return $result->fetch_assoc();
}

function verifyServerAuth() {
    $headers = getallheaders();
    $apiKey = $headers['X-API-Key'] ?? $headers['x-api-key'] ?? '';

    if ($apiKey !== SERVER_API_KEY) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid server API key']);
        exit();
    }

    return true;
}

/** Allow Node server CLI calls using X-API-Key instead of a user token. */
function verifyAuthOrServer() {
    $headers = getallheaders();
    $apiKey = $headers['X-API-Key'] ?? $headers['x-api-key'] ?? '';

    if ($apiKey === SERVER_API_KEY) {
        return ['id' => 0, 'username' => 'server', 'type' => 'Server'];
    }

    return verifyAuth();
}
