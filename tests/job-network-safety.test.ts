import { describe, expect, test } from "bun:test";

import { isPrivateAddress } from "@/lib/jobs/network-safety";

describe("job source network safety", () => {
  test("blocks loopback, private, link-local, and carrier-grade NAT addresses", () => {
    for (const address of ["127.0.0.1", "10.0.0.4", "172.20.0.1", "192.168.1.1", "169.254.1.2", "100.64.0.1", "::1", "fd00::1", "fe80::1"]) {
      expect(isPrivateAddress(address)).toBe(true);
    }
  });

  test("allows public IPv4 and IPv6 addresses", () => {
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("2606:4700:4700::1111")).toBe(false);
  });
});
