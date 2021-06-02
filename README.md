[![Dev Build Status](https://aprilmintacpineda.semaphoreci.com/badges/sls-proj-pronetplat-aa/branches/dev.svg?style=shields&key=0f205d37-246f-47a6-a059-9d175a48a0dd)](https://aprilmintacpineda.semaphoreci.com/projects/sls-proj-pronetplat-aa)
[![Master Build Status](https://aprilmintacpineda.semaphoreci.com/badges/sls-proj-pronetplat-aa/branches/master.svg?style=shields&key=0f205d37-246f-47a6-a059-9d175a48a0dd)](https://aprilmintacpineda.semaphoreci.com/projects/sls-proj-pronetplat-aa)

# Project Professional Network Platform

Internally called `proj_pronetplat_aa`, the `proj` is short for **project** and the `net` is short for **networking** and the `plat` is short for **platform** while the `aa` indicates that this is the first implementation of the concept.

Publicly called as **Entrepic** a _professsional networking platform_, a platform for professionals, business persons, and entrepreneurs to grow.

# Engineering conventions

1. `FunctionName` should follow the format `{stage}-{proj-pronetplat-aa}-fileName`
2. File name of functions should be the same as `FunctionName` in `template.yaml`, exlucing the prefixes.
3. Always set `Function.Metadata.BuildMethod` to `makefile`.

:+1: **THIS IS CORRECT**

```diff
logout:
  Type: AWS::Serverless::Function
+ Metadata:
+  BuildMethod: makefile
  Properties:
    Handler: logout.handler
    Policies:
      - LambdaInvokePolicy:
          FunctionName: !Ref forceExpireDeviceToken
-   FunctionName: "proj-pronetplat-aa-logoutFile"
+   FunctionName: !Join
+     - '-'
+     - - !Ref Stage
+        - "proj-pronetplat-aa-logoutFile"
+        - "proj-pronetplat-aa-logout"
    Events:
      ApiEvent:
        Type: Api
        Properties:
          Method: post
          Path: /logout
          RestApiId:
            Ref: mainBackendApi
```

# History

Started development on December of 2020, I conceptualized about this in mid 2017 when I was still actively attending tech conferences, I saw people exchanging calling cards, some of them ran out of calling cards, some of them spent more than 500 pesos just of around 300 copies of calling cards.

First concept had a connecting mechanism inspired by **shareit** a mobile app for sharing files using wifi hotspots. Then while thinking about developing it, I conceptualized different approaches that I also plan to implement in the future.