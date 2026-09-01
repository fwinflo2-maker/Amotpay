<?php

declare(strict_types=1);

namespace AmotPay\Admin;

/**
 * Current admin session context. PIN auth maps to SUPER_ADMIN until per-user admin accounts exist.
 */
final class AdminContext
{
  private static string $role = 'SUPER_ADMIN';

  /** @return list<string> */
  public static function permissions(): array
  {
    return AdminPermission::superAdmin();
  }

  public static function require(string $permission): void
  {
    if (!AdminPermission::hasPermission(self::permissions(), $permission)) {
      throw new \AmotPay\Http\ApiException('Insufficient admin permissions', 403, 'FORBIDDEN');
    }
  }
}
