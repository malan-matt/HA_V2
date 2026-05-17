<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

verifyServerAuth();

$data = json_decode(file_get_contents('php://input'), true);
$flightId = $data['flight_id'] ?? null;
$latitude = $data['latitude'] ?? null;
$longitude = $data['longitude'] ?? null;
$status = $data['status'] ?? null;

if (!$flightId || $latitude === null || $longitude === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Flight ID, latitude, and longitude required']);
    exit();
}

$conn = getDBConnection();
$query = 'UPDATE flights SET current_latitude = ?, current_longitude = ?';
$params = [(float) $latitude, (float) $longitude];
$types = 'dd';

if ($status) {
    $query .= ', status = ?';
    $params[] = $status;
    $types .= 's';
}

$query .= ' WHERE id = ?';
$params[] = (int) $flightId;
$types .= 'i';

$stmt = $conn->prepare($query);
$stmt->bind_param($types, ...$params);
$stmt->execute();

if ($stmt->affected_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Flight not found']);
    exit();
}

echo json_encode(['success' => true, 'message' => 'Position updated']);
