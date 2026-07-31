import { CheckIcon, XIcon } from '@phosphor-icons/react';

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const checks = [
    {
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      label: 'Contains uppercase and lowercase letters',
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      label: 'Contains numbers or special characters',
      met: /\d/.test(password) || /[^A-Za-z0-9]/.test(password),
    },
  ];

  return (
    <ul className="space-y-1.5">
      {checks.map((check) => {
        const Icon = check.met ? CheckIcon : XIcon;
        const color = check.met ? 'text-green-700' : 'text-destructive';

        return (
          <li
            key={check.label}
            className={`flex items-center gap-2 text-xs ${color}`}
          >
            <Icon size={14} weight="bold" aria-hidden />
            {check.label}
          </li>
        );
      })}
    </ul>
  );
}
