# TLS Setup on VPS (Let's Encrypt)

## Prerequisites

- Domain pointing to your VPS IP (A record)
- Ports 80 and 443 open in VPS firewall

## Install certbot

```bash
sudo apt update && sudo apt install certbot
```

## Obtain certificate

```bash
sudo certbot certonly --standalone -d yourdomain.com
```

Certificates are saved to `/etc/letsencrypt/live/yourdomain.com/`.

## Set env vars on the server

```
TLS_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
TLS_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
PORT=443
```

## Auto-renewal

```bash
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet && systemctl restart your-app
```
