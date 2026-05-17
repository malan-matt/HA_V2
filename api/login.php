<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password required']);
    exit();
}

$conn = getDBConnection();
$stmt = $conn->prepare('SELECT id, username, type, password, salt FROM users WHERE username = ?');
$stmt->bind_param('s', $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials, Statement returend empty']);
    exit();
}

$user = $result->fetch_assoc();
$hashedPassword = hash('sha256', $password . $user['salt']);

// Accept SHA-256+salt (PA3 style) or legacy plain-text passwords from early seeds
$valid = ($hashedPassword === $user['password']) || ($password === $user['password']);

if (!$valid) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    exit();
}

$newApiKey = bin2hex(random_bytes(32));
$updateStmt = $conn->prepare('UPDATE users SET api_key = ? WHERE id = ?');
$updateStmt->bind_param('si', $newApiKey, $user['id']);
$updateStmt->execute();

echo json_encode([
    'success' => true,
    'token' => $newApiKey,
    'user' => [
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'type' => $user['type'],
    ],
]);
