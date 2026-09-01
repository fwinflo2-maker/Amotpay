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
    }
}
