<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Database\Database;

final class AuditService
{
    public static function log(
        string $action,
        ?int $userId = null,
        ?string $resourceType = null,
        ?string $resourceId = null,
        ?string $ipAddress = null,
        array $metadata = [],
    ): void {
        try {
            Database::connection()->prepare(
                'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, metadata)
                 VALUES (?, ?, ?, ?, ?, ?)'
            )->execute([
                $userId,
                $action,
                $resourceType,
                $resourceId,
                $ipAddress,
                $metadata === [] ? null : json_encode($metadata, JSON_UNESCAPED_SLASHES),
            ]);
        } catch (\Throwable) {
            // Auditing must not expose or replace the original API result.
        }
    }

    public static function error(string $incidentId, \Throwable $error, string $path): void
    {
        try {
            Database::connection()->prepare(
                'INSERT INTO system_errors (incident_id, error_class, safe_message, request_path)
                 VALUES (?, ?, ?, ?)'
            )->execute([
                $incidentId,
                get_class($error),
                substr($error->getMessage(), 0, 500),
                substr($path, 0, 255),
            ]);
        } catch (\Throwable) {
            error_log('AmotPay incident ' . $incidentId . ': ' . get_class($error));
        }
    }
}
