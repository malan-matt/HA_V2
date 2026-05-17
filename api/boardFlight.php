<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$user = verifyAuth();
if ($user['type'] !== 'Passenger') {
    http_response_code(403);
    echo json_encode(['error' => 'Only passengers can board flights']);
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
$query = "
    SELECT pf.id AS booking_id, pf.boarding_confirmed, f.dispatched_at, f.status,
           TIMESTAMPDIFF(SECOND, f.dispatched_at, NOW()) AS seconds_since_dispatch
    FROM passenger_flights pf
    JOIN flights f ON pf.flight_id = f.id
    WHERE pf.passenger_id = ? AND pf.flight_id = ?
";
$stmt = $conn->prepare($query);
$stmt->bind_param('ii', $user['id'], $flightId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Booking not found']);
    exit();
}

$booking = $result->fetch_assoc();

if ($booking['status'] !== 'Boarding') {
    http_response_code(400);
    echo json_encode(['error' => 'Flight is not in boarding status']);
    exit();
}

if ((int) $booking['seconds_since_dispatch'] > 60) {
    http_response_code(400);
    echo json_encode(['error' => 'Boarding window has expired (60 seconds)']);
    exit();
}

if ($booking['boarding_confirmed']) {
    http_response_code(400);
    echo json_encode(['error' => 'Boarding already confirmed']);
    exit();
}

$updateStmt = $conn->prepare(
    'UPDATE passenger_flights SET boarding_confirmed = 1, confirmed_at = NOW() WHERE id = ?'
);
$updateStmt->bind_param('i', $booking['booking_id']);
$updateStmt->execute();

echo json_encode(['success' => true, 'message' => 'Boarding confirmed successfully']);
