<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$user = verifyAuthOrServer();
$flightId = $_GET['id'] ?? null;

if (!$flightId) {
    http_response_code(400);
    echo json_encode(['error' => 'Flight ID required']);
    exit();
}

$conn = getDBConnection();

if ($user['type'] === 'Passenger') {
    $checkStmt = $conn->prepare(
        'SELECT COUNT(*) AS count FROM passenger_flights WHERE passenger_id = ? AND flight_id = ?'
    );
    $checkStmt->bind_param('ii', $user['id'], $flightId);
    $checkStmt->execute();
    $checkRow = $checkStmt->get_result()->fetch_assoc();
    if ((int) $checkRow['count'] === 0) {
        http_response_code(403);
        echo json_encode(['error' => 'You are not booked on this flight']);
        exit();
    }
}

$query = "
    SELECT u.id, u.username, pf.seat_number, pf.boarding_confirmed, pf.confirmed_at
    FROM passenger_flights pf
    JOIN users u ON pf.passenger_id = u.id
    WHERE pf.flight_id = ?
    ORDER BY pf.seat_number
";
$stmt = $conn->prepare($query);
$stmt->bind_param('i', $flightId);
$stmt->execute();
$result = $stmt->get_result();

$passengers = [];
while ($row = $result->fetch_assoc()) {
    $passengers[] = [
        'id' => (int) $row['id'],
        'username' => $row['username'],
        'seat_number' => $row['seat_number'],
        'boarding_confirmed' => (bool) $row['boarding_confirmed'],
        'confirmed_at' => $row['confirmed_at'],
    ];
}

echo json_encode(['success' => true, 'passengers' => $passengers]);
