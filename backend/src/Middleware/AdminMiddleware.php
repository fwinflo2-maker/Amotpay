<?php

declare(strict_types=1);

namespace AmotPay\Middleware;

use AmotPay\Http\Request;
use AmotPay\Http\Response;
use AmotPay\Services\AdminService;

final class AdminMiddleware
{
    public function __construct(private ?AdminService $admin = null)
    {
        $this->admin ??= new AdminService();
    }

    public function handle(Request $request): void
    {
        if (!$this->admin->validateToken($request->bearerToken())) {
            Response::error('Admin unauthorized', 401, 'ADMIN_UNAUTHORIZED');
        }

        $info = $this->admin->getAccountInfo();
        if (!($info['password_change_required'] ?? false)) {
            return;
        }

        $allowed = [
            '/api/admin/account',
            '/api/admin/account/password',
            '/api/admin/account/credentials',
            '/api/admin/logout',
            '/api/admin/migrations',
            '/api/admin/migrations/apply',
        ];
        if (!in_array($request->path, $allowed, true)) {
            Response::error('Password change required', 403, 'PASSWORD_CHANGE_REQUIRED');
        }
    }
}
