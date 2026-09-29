# Wastewater to housing selling price

1. From VCGI, get parcels
2. From VCGI, get usage // sales tax
3. buffer around linear data of pipes
4. if buffer goes through parcel, etc. => binary for wastewater or not.
5. Normalize
   - by area (prices of homes within region)
   - by size of the parcel itself
   - regression on size itself, etc.
   - see how big the coefficient
