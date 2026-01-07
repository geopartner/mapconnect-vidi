# Orbicon insights DV integration

Denne extension er en tynd klient til WSP/Orbicon insights DV

For at benytte udvidelsen skal flg. defineres i extensionConfig:

    extensionConfig: {
      orbiinsight: {
        accessToken: "YOUR_ACCESS_TOKEN_HERE",
        rw_access: [], // List of usernames with write
        dv_uri: "ORBI_INSIGHT_API",
      },
    },
