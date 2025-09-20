---
id: 'brunito-first-avionics-system'
title: 'Brunito - The First Avionics System at the Rocket Launchers for Disparado'
date: 'July 11, 2025'
excerpt: 'The inspiring journey of developing Brunito, our contingency flight computer, amid trade disruptions and tight deadlines.'
readTime: '10 min read'
tags: ['Avionics', 'Flight Computer', 'STM32', 'Embedded Systems', 'RTOS', 'Rocket Launchers']
---

In early 2024, our avionics team had to make fast, decisive moves. Supply issues and tight deadlines pushed us to design and build a backup flight computer we called Brunito.

![Brunito prototype flight computer](assets/brunito-proto.jpg)

Building on Bruno's foundations, we focused on simplicity and reliability. We reduced payload, hardened power rails, and tightened the real-time loops—enough to handle critical telemetry and event logging during test flights.

[video: videos/brunitosquirt.mp4 | Final systems check: power-on self-test with actuator pulses | controls=true | muted=true | autoplay=false | loop=false]

# Lessons Learned

- Mitigate EMI early by isolating switching regulators
- Keep ISR work minimal; defer to tasks
- Always log more than you think you need
