# Customers API

## Updating Datastore indexes

To update the indexes in Google Cloud Datastore, using the auto-generated indexes from the dev gcd tool, run the following script from the gcd container:

```
cd gcd-v1beta2-rev1-3.0.2
./gcd.sh updateindexes --auth_mode=oauth2 --dataset_id_override=[gcloud-project-id] /opt/gcd/data/
```

https://cloud.google.com/datastore/docs/tools/indexconfig
