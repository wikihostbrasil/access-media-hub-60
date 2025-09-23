<?php
include_once '../config/cors.php';
include_once '../config/database.php';
include_once '../config/jwt.php';
include_once '../config/security.php';
include_once '../config/auth-security.php';

$database = new Database();
$db = $database->getConnection();
$jwt = new JWTHandler();
$auth_security = new AuthSecurity($db);

// Validate token
$token = $jwt->getBearerToken();
if (!$token) {
    http_response_code(401);
    echo json_encode(array("error" => "Token não fornecido"));
    exit();
}

$user_data = $jwt->validateToken($token);
if (!$user_data) {
    http_response_code(401);
    echo json_encode(array("error" => "Token inválido"));
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = $user_data['id'];
    
    if (!isset($data['full_name'])) {
        http_response_code(400);
        echo json_encode(array("error" => "Nome completo é obrigatório"));
        exit();
    }

    $full_name = trim($data['full_name']);
    $whatsapp = isset($data['whatsapp']) ? trim($data['whatsapp']) : null;
    $receive_notifications = isset($data['receive_notifications']) ? (bool)$data['receive_notifications'] : true;

    try {
        $query = "UPDATE profiles SET 
                    full_name = :full_name, 
                    whatsapp = :whatsapp, 
                    receive_notifications = :receive_notifications,
                    updated_at = NOW()
                  WHERE user_id = :user_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":full_name", $full_name);
        $stmt->bindParam(":whatsapp", $whatsapp);
        $stmt->bindParam(":receive_notifications", $receive_notifications, PDO::PARAM_BOOL);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(array("error" => "Perfil não encontrado"));
            exit();
        }

        http_response_code(200);
        echo json_encode(array("message" => "Perfil atualizado com sucesso"));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("error" => "Erro ao atualizar perfil"));
    }
} else {
    http_response_code(405);
    echo json_encode(array("error" => "Método não permitido"));
}
?>