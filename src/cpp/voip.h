#pragma once
#include "portaudio.h"
#include <cstdint>
#include <thread>
#include <vector>

class Voip {
public:
  using IP = std::vector<uint8_t>;

private:
  static Voip *voip;
  std::thread *callThread = nullptr;
  bool killThread = false;
  void processData();
  void terminateThread();
  void spawnThread();
  std::vector<IP> connections;
  static int micCallback(const void *inputBuffer, void *outputBuffer,
                         unsigned long frameCount,
                         const PaStreamCallbackTimeInfo *timeInfo,
                         PaStreamCallbackFlags statusFlags, void *userData);

public:
  Voip();
  static IP stoIP(std::string s);
  void join(IP ip);
  void leave();
  std::thread *getThread();
  static Voip *getVoip() { return voip; };
  const std::vector<IP> &getConnections() { return connections; };
};