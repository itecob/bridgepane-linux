# Linux sandbox prerequisites

Codex uses Bubblewrap for command sandboxing on Linux. Install the distribution
package rather than disabling user-namespace protections:

```bash
sudo apt install bubblewrap
```

```bash
sudo dnf install bubblewrap
```

Ubuntu 24.04 may also require the distribution's AppArmor profile:

```bash
sudo apt update
sudo apt install apparmor-profiles apparmor-utils
sudo install -m 0644 \
  /usr/share/apparmor/extra-profiles/bwrap-userns-restrict \
  /etc/apparmor.d/bwrap-userns-restrict
sudo apparmor_parser -r /etc/apparmor.d/bwrap-userns-restrict
```

Ubuntu 25.04 and newer normally ship the profile at
`/etc/apparmor.d/bwrap-userns-restrict` through the standard AppArmor package.

The application treats Codex's bubblewrap/user-namespace startup warning as a
blocking security error. Correct the operating-system configuration and select
**Restart Codex**. It will not automatically disable AppArmor restrictions or
fall back to an unsandboxed Codex turn.

Source: [official Codex sandbox documentation](https://learn.chatgpt.com/docs/sandboxing).
