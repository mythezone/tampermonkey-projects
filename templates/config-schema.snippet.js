const CONFIG_SCHEMA = [
  {
    title: 'Webhook',
    fields: [
      {
        path: 'webhookUrl',
        label: 'Webhook URL',
        type: 'url',
        placeholder: 'https://your-webhook.example.com/endpoint',
        description: 'Description here.',
      },
    ],
  },
  {
    title: 'Basic Auth',
    fields: [
      {
        path: 'auth.user',
        label: 'User',
        type: 'text',
        placeholder: 'username',
        description: 'Description here.',
      },
      {
        path: 'auth.password',
        label: 'Password',
        type: 'password',
        placeholder: 'password',
        description: 'Description here.',
      },
    ],
  },
  {
    title: 'Enabled Domains',
    fields: [
      {
        path: 'enabledDomains',
        label: 'Domain List',
        type: 'textarea',
        placeholder: 'example.com\n*.example.org',
        description: 'One domain per line.',
      },
    ],
  },
];

