# Security Policy

## Supported Versions

AURUM PREDICT is currently an early-stage, local, single-user research tool.
Security fixes are applied to the latest code on the `main` branch until
versioned releases are established.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Earlier snapshots or forks | No |

## Intended Deployment Boundary

This project is designed for local development and research use. It is not
designed to be exposed directly to the public internet or operated as a
multi-user service.

The current application boundary includes:

- a Flask backend with filesystem-backed session state;
- a React/Vite frontend;
- CSV dataset upload and prediction export functionality;
- GRU-based model inference and associated serialized model/scaler artifacts;
- no authentication or authorization layer.

Do not deploy this application publicly without adding authentication,
authorization, secure production session handling, upload hardening, rate
limiting, HTTPS, production CORS configuration, secret management, dependency
monitoring, and an appropriate hosting review.

## Reporting a Vulnerability

Please do not open a public issue for a suspected vulnerability.

Report security concerns privately by emailing **wahyuabrory@gmail.com** with
the subject line `AURUM PREDICT Security Report`. Include:

- a description of the issue and affected component;
- steps to reproduce or a proof of concept;
- potential impact;
- any suggested remediation, if available.

Please avoid accessing, modifying, or disclosing data beyond what is necessary
to demonstrate the issue.

## Areas of Particular Interest

Reports concerning the following areas are especially useful:

- CSV upload validation, malicious file contents, or resource-exhaustion inputs;
- session configuration, cookie behavior, or filesystem session storage;
- CORS and secret-key configuration;
- dependency vulnerabilities in Python or JavaScript packages;
- unsafe handling of exported prediction data;
- serialized ML model/scaler assets or inference-time input validation;
- asynchronous job handling and denial-of-service risks.

## Response Expectations

The maintainer will make a best effort to acknowledge a report within 7 days,
assess severity and reproducibility, and publish a fix or mitigation when
appropriate. Coordinated disclosure is requested until a remediation is
available.
