<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$user = verifyAuth();
if ($user['type'] !== 'ATC') {
    http_response_code(403);
    echo json_encode(['error' => 'Only ATC can dispatch flights']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
$flightId = $data['flight_id'] ?? null;

if (!$flightId) {
    http_response_code(400);
    echo json_encode(['error' => 'Flight ID required']);
    exit();
}

$conn = getDBConnection();
$checkStmt = $conn->prepare('SELECT status FROM flights WHERE id = ?');
$checkStmt->bind_param('i', $flightId);
$checkStmt->execute();
$result = $checkStmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Flight not found']);
    exit();
}

$flight = $result->fetch_assoc();
if ($flight['status'] !== 'Scheduled') {
    http_response_code(400);
    echo json_encode(['error' => 'Flight can only be dispatched from Scheduled status']);
    exit();
}

$updateStmt = $conn->prepare("UPDATE flights SET status = 'Boarding', dispatched_at = NOW() WHERE id = ?");
$updateStmt->bind_param('i', $flightId);
$updateStmt->execute();

echo json_encode(['success' => true, 'message' => 'Flight dispatched successfully']);
