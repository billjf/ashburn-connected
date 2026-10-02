async function initMap() {
    // ========================================
    // LOCATIONS + MAP SETUP
    // ========================================

    const ashburn = { lat: 39.0438, lng: -77.4874 };
    const iad = { lat: 38.9531, lng: -77.4565 };

    const map = new google.maps.Map(document.getElementById("map"), {
        center: ashburn,
        zoom: 11
    });

    new google.maps.Marker({
        position: iad,
        map,
        title: "Washington Dulles International Airport",
        icon: {
            url: "images/iad-marker.png",
            scaledSize: new google.maps.Size(90, 70)
        }
    });

    const { Place } = await google.maps.importLibrary("places");

    const infoWindow = new google.maps.InfoWindow({
        disableAutoPan: true
    });

    let connectionLine = null;


// ========================================
// DOM REFERENCES
// ========================================

const breweryList =
    document.getElementById("brewery-list");

const coffeeList =
    document.getElementById("coffee-list");

const restaurantList =
    document.getElementById("restaurant-list");

const sidebarTitle =
    document.getElementById("sidebar-title");

const breweryButton =
    document.getElementById("toggle-breweries");

const evButton =
    document.getElementById("toggle-ev");

const iadBeerButton =
    document.getElementById("toggle-iad-beer");

const coffeeButton =
    document.getElementById("toggle-coffee");

const restaurantButton =
    document.getElementById("restaurantsBtn"); 


    // ========================================
    // MARKER GROUPS
    // ========================================

    const breweryMarkers = [];
    const evMarkers = [];
    const iadBeerMarkers = [];
    const coffeeMarkers = [];
    const restaurantMarkers = [];


    // ========================================
    // GOOGLE PLACES SEARCHES
    // ========================================

    const breweryRequest = {
        fields: [
            "displayName",
            "formattedAddress",
            "location",
            "rating",
            "userRatingCount",
            "regularOpeningHours",
            "photos"
        ],

        locationRestriction: {
            center: ashburn,
            radius: 20000
        },

        includedPrimaryTypes: ["brewery"],

        maxResultCount: 10
    };


    const coffeeRequest = {
    textQuery:
        "coffee shops and cafes in Ashburn Virginia",

    fields: [
        "displayName",
        "formattedAddress",
        "location",
        "rating",
        "userRatingCount",
        "regularOpeningHours",
        "photos",
        "primaryType"
    ],

    locationBias: {
        center: ashburn,
        radius: 15000
    },

    includedType: "cafe",

    maxResultCount: 15
};

    const restaurantRequest = {
    fields: [
        "displayName",
        "formattedAddress",
        "location",
        "rating",
        "userRatingCount",
        "regularOpeningHours",
        "photos"
    ],

    locationRestriction: {
        center: ashburn,
        radius: 20000
    },

    includedPrimaryTypes: ["restaurant"],

    maxResultCount: 15
};

    const evRequest = {
        fields: [
            "displayName",
            "formattedAddress",
            "location"
        ],

        locationRestriction: {
            center: ashburn,
            radius: 20000
        },

        includedPrimaryTypes: [
            "electric_vehicle_charging_station"
        ],

        maxResultCount: 20
    };


    const iadBeerRequest = {
        textQuery:
            "bars restaurants beer inside Washington Dulles International Airport IAD",

        fields: [
            "displayName",
            "formattedAddress",
            "location",
            "rating",
            "userRatingCount"
        ],

        locationBias: {
            center: iad,
            radius: 5000
        },

        maxResultCount: 10
    };


// Run Google Places searches

const { places: breweries } =
    await Place.searchNearby(breweryRequest);

const { places: coffeePlaces } =
    await Place.searchByText(coffeeRequest);

const sortedCoffeePlaces =
    [...coffeePlaces].sort(
        (a, b) =>
            calculateConnectedScore(b) -
            calculateConnectedScore(a)
    );   

  console.log(
    "Coffee & Wi-Fi results:",
    coffeePlaces.map((place) => ({
        name: place.displayName,
        type: place.primaryType,
        rating: place.rating,
        reviews: place.userRatingCount
    }))
);  

const { places: restaurants } =
    await Place.searchNearby(restaurantRequest);

const { places: evStations } =
    await Place.searchNearby(evRequest);

const { places: iadBeerVenues } =
    await Place.searchByText(iadBeerRequest);


    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    function calculateRawScore(place) {
        const rating = place.rating || 0;
        const reviewCount = place.userRatingCount || 0;

        return rating * Math.log10(reviewCount + 10);
    }


    function calculateConnectedScore(place) {
        const rawScore = calculateRawScore(place);
        const normalized = (rawScore / 16) * 100;

        return Math.min(
            100,
            Math.round(normalized)
        );
    }


    function calculateDistanceMiles(
        lat1,
        lng1,
        lat2,
        lng2
    ) {
        const earthRadiusMiles = 3958.8;

        const toRadians = (degrees) =>
            (degrees * Math.PI) / 180;

        const dLat =
            toRadians(lat2 - lat1);

        const dLng =
            toRadians(lng2 - lng1);

        const a =
            Math.sin(dLat / 2) *
                Math.sin(dLat / 2) +

            Math.cos(toRadians(lat1)) *
                Math.cos(toRadians(lat2)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);

        const c =
            2 *
            Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            );

        return earthRadiusMiles * c;
    }


    function findNearestEVStation(place) {
        let nearestStation = null;
        let nearestDistance = Infinity;

        evStations.forEach((station) => {
            if (!station.location) {
                return;
            }

            const distance =
                calculateDistanceMiles(
                    place.location.lat(),
                    place.location.lng(),
                    station.location.lat(),
                    station.location.lng()
                );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestStation = station;
            }
        });

        return {
            station: nearestStation,
            distance: nearestDistance
        };
    }


    function getRatingText(place) {
        return place.rating !== undefined
            ? `${place.rating} ★`
            : "No rating available";
    }


    function getReviewText(place) {
        return place.userRatingCount !== undefined
            ? `${place.userRatingCount} reviews`
            : "";
    }


    function getPhotoUrl(place) {
        if (
            !place.photos ||
            place.photos.length === 0
        ) {
            return null;
        }

        return place.photos[0].getURI({
            maxWidth: 400,
            maxHeight: 250
        });
    }


    function toggleMarkerGroup(
        markers,
        button
    ) {
        const isActive =
            button.classList.contains("active");

        markers.forEach((marker) => {
            marker.setMap(
                isActive ? null : map
            );
        });

        button.classList.toggle("active");
    }


    // ========================================
    // COFFEE + WORK SPOTS
    // ========================================

    sortedCoffeePlaces.forEach((place, index) => {
        if (!place.location) {
            return;
        }


        // ----------------------------------------
        // COFFEE MARKER
        // ----------------------------------------

        const coffeeMarker =
            new google.maps.Marker({
                position: place.location,
                map,
                title: place.displayName,

                label: {
                    text: "☕",
                    fontSize: "20px"
                }
            });

        coffeeMarkers.push(coffeeMarker);


        // ----------------------------------------
        // COFFEE INFORMATION
        // ----------------------------------------

        const distanceToIAD =
            calculateDistanceMiles(
                place.location.lat(),
                place.location.lng(),
                iad.lat,
                iad.lng
            );

        const nearestEV =
            findNearestEVStation(place);

        const coffeePhotoUrl =
            getPhotoUrl(place);

        const rating =
            getRatingText(place);

        const reviews =
            getReviewText(place);

        const connectedScore =
        calculateConnectedScore(place);

        // ----------------------------------------
        // COFFEE SIDEBAR CARD
        // ----------------------------------------

        const coffeeCard =
            document.createElement("div");

        coffeeCard.className =
            "brewery-card";

        coffeeCard.innerHTML = `
            <strong>
            ${index + 1}. ${place.displayName}       
            </strong>  

            <br>

            ${rating}
            ${reviews ? ` · ${reviews}` : ""}

            <br>

         <strong>
         Connected Score: ${connectedScore}/100
         </strong>

         <br>   
            <small>
                ✈ ${distanceToIAD.toFixed(1)}
                miles from IAD
            </small>

            <br>

            ${
                nearestEV.station
                    ? `
                        <small>
                            ⚡ Nearest EV:
                            ${nearestEV.station.displayName}
                            (${nearestEV.distance.toFixed(1)} mi)
                        </small>
                    `
                    : ""
            }

            <br>

            <small>
                📶 Wi-Fi: Verify
            </small>
        `;


        // Add coffee photo

        if (coffeePhotoUrl) {
            const coffeePhoto =
                document.createElement("img");

            coffeePhoto.src =
                coffeePhotoUrl;

            coffeePhoto.alt =
                place.displayName;

            coffeePhoto.className =
                "brewery-photo";

            coffeeCard.prepend(
                coffeePhoto
            );
        }


        // Sidebar card click

        coffeeCard.addEventListener(
            "click",
            () => {
                google.maps.event.trigger(
                    coffeeMarker,
                    "click"
                );

                map.panTo(
                    place.location
                );

                map.setZoom(14);
            }
        );


        coffeeList.appendChild(
            coffeeCard
        );


        // ----------------------------------------
        // COFFEE MAP POPUP
        // ----------------------------------------

        coffeeMarker.addListener(
            "click",
            () => {
                infoWindow.setContent(`
                    <div style="
                        max-width: 260px;
                        font-family: Arial, sans-serif;
                    ">

                        <h3>
                            ${place.displayName}
                        </h3>

                        <div>
                            ${rating}
                            ${reviews
                                ? ` · ${reviews}`
                                : ""
                            }
                        </div>

                        <div style="
                            margin-top: 8px;
                        ">
                            ${place.formattedAddress}
                        </div>

                        <div style="
                            margin-top: 10px;
                        ">
                            ☕ Coffee / Work Spot
                        </div>

                        <div style="
                            margin-top: 6px;
                        ">
                            ✈ ${distanceToIAD.toFixed(1)}
                            miles from IAD
                        </div>

                        ${
                            nearestEV.station
                                ? `
                                    <div style="
                                        margin-top: 6px;
                                    ">
                                        ⚡ Nearest EV:
                                        ${nearestEV.station.displayName}
                                        (${nearestEV.distance.toFixed(1)} mi)
                                    </div>
                                `
                                : ""
                        }

                        <div style="
                            margin-top: 6px;
                        ">
                            📶 Wi-Fi availability:
                            <strong>Verify</strong>
                        </div>

                    </div>
                `);

                infoWindow.open({
                    anchor: coffeeMarker,
                    map
                });
            }
        );
    });


    // ========================================
    // IAD BEER VENUES
    // ========================================

    iadBeerVenues.forEach((venue) => {
        if (!venue.location) {
            return;
        }

        const iadBeerMarker =
            new google.maps.Marker({
                position: venue.location,
                map,
                title: venue.displayName,

                icon: {
                    url:
                        "images/airport-brewery-pub.png",

                    scaledSize:
                        new google.maps.Size(
                            36,
                            36
                        )
                }
            });

        iadBeerMarkers.push(
            iadBeerMarker
        );


        iadBeerMarker.addListener(
            "click",
            () => {
                const rating =
                    getRatingText(venue);

                const reviews =
                    getReviewText(venue);

                infoWindow.setContent(`
                    <div style="
                        max-width: 260px;
                        font-family: Arial, sans-serif;
                    ">

                        <strong>
                            🍻 IAD Beer Stop
                        </strong>

                        <h3>
                            ${venue.displayName}
                        </h3>

                        <div>
                            ${rating}
                            ${reviews
                                ? ` · ${reviews}`
                                : ""
                            }
                        </div>

                        <div style="
                            margin-top: 8px;
                        ">
                            ${venue.formattedAddress}
                        </div>

                        <div style="
                            margin-top: 8px;
                        ">
                            ✈ Inside / near IAD
                        </div>

                    </div>
                `);

                infoWindow.open({
                    anchor: iadBeerMarker,
                    map
                });
            }
        );
    });


    // ========================================
    // BREWERIES
    // ========================================

    const sortedBreweries =
        [...breweries].sort(
            (a, b) =>
                calculateConnectedScore(b) -
                calculateConnectedScore(a)
        );


    sortedBreweries.forEach(
        (place, index) => {
            if (!place.location) {
                return;
            }

        // ----------------------------------------
            // BREWERY INFORMATION
            // ----------------------------------------

            const connectedScore =
                calculateConnectedScore(place);

            const distanceMiles =
                calculateDistanceMiles(
                    ashburn.lat,
                    ashburn.lng,
                    place.location.lat(),
                    place.location.lng()
                );

            const distanceToIAD =
                calculateDistanceMiles(
                    place.location.lat(),
                    place.location.lng(),
                    iad.lat,
                    iad.lng
                );

            const nearestEV =
                findNearestEVStation(place);

            const rating =
                getRatingText(place);

            const reviews =
                getReviewText(place);

            const photoUrl =
                getPhotoUrl(place);


            // ----------------------------------------
            // BREWERY MARKER
            // ----------------------------------------

            const breweryMarker =
                new google.maps.Marker({
                    position:
                        place.location,

                    map,

                    title:
                        place.displayName,

                    icon: {
                        url:
                            "images/beer-marker-1.png",

                        scaledSize:
                            new google.maps.Size(
                                30,
                                30
                            )
                    }
                });

            breweryMarkers.push(
                breweryMarker
            );


            // ----------------------------------------
            // BREWERY SIDEBAR CARD
            // ----------------------------------------

            const card =
                document.createElement("div");

            card.className =
                "brewery-card";

            card.innerHTML = `

                ${
                    photoUrl
                        ? `
                            <img
                                src="${photoUrl}"
                                alt="${place.displayName}"
                                class="brewery-photo"
                            >
                        `
                        : ""
                }

                <strong>
                    ${index + 1}.
                    ${place.displayName}
                </strong>

                <br>

                ${rating}

                ${reviews
                    ? ` · ${reviews}`
                    : ""
                }

                <br>

                <strong>
                    Connected Score:
                    ${connectedScore}/100
                </strong>

                <br>

                <small>
                    ${distanceMiles.toFixed(1)}
                    miles from Ashburn
                </small>

                <br>

                <small>
                    ✈ ${distanceToIAD.toFixed(1)}
                    miles from IAD
                </small>

                <br>

                ${
                    nearestEV.station
                        ? `
                            <small>
                                ⚡ Nearest EV:
                                ${nearestEV.station.displayName}
                                (${nearestEV.distance.toFixed(1)} mi)
                            </small>
                        `
                        : ""
                }
            `;


            breweryList.appendChild(
                card
            );


            // ----------------------------------------
            // OPEN BREWERY POPUP
            // ----------------------------------------

            function openBreweryPopup() {
                let todayHours =
                    "Hours unavailable";

                let fullHours = "";


                // Get operating hours

                if (
                    place.regularOpeningHours &&
                    place.regularOpeningHours
                        .weekdayDescriptions
                ) {
                    const days =
                        place.regularOpeningHours
                            .weekdayDescriptions;

                    const todayName =
                        new Date()
                            .toLocaleDateString(
                                "en-US",
                                {
                                    weekday:
                                        "long"
                                }
                            );

                    const todayEntry =
                        days.find(
                            (day) =>
                                day.startsWith(
                                    todayName
                                )
                        );

                    if (todayEntry) {
                        todayHours =
                            todayEntry;
                    }

                    fullHours =
                        days
                            .map(
                                (day) =>
                                    `<div>${day}</div>`
                            )
                            .join("");
                }


                // Remove previous EV connection line

                if (connectionLine) {
                    connectionLine.setMap(
                        null
                    );
                }


                // Draw brewery → nearest EV line

                if (
                    nearestEV.station &&
                    nearestEV.station.location
                ) {
                    connectionLine =
                        new google.maps.Polyline({
                            path: [
                                place.location,
                                nearestEV.station.location
                            ],

                            geodesic: true,

                            strokeColor:
                                "#ec11bd",

                            strokeOpacity:
                                1.0,

                            strokeWeight:
                                4,

                            map
                        });


                    const bounds =
                        new google.maps
                            .LatLngBounds();

                    bounds.extend(
                        place.location
                    );

                    bounds.extend(
                        nearestEV.station.location
                    );


                    map.fitBounds(
                        bounds,
                        {
                            top: 180,
                            right: 80,
                            bottom: 80,
                            left: 80
                        }
                    );
                }


                // ----------------------------------------
                // BREWERY POPUP CONTENT
                // ----------------------------------------

                infoWindow.setContent(`
                    <div style="
                        max-width: 300px;
                        font-family: Arial, sans-serif;
                    ">

                        ${
                            photoUrl
                                ? `
                                    <img
                                        src="${photoUrl}"
                                        alt="${place.displayName}"
                                        style="
                                            width: 100%;
                                            height: 150px;
                                            object-fit: cover;
                                            border-radius: 8px;
                                            margin-bottom: 8px;
                                        "
                                    >
                                `
                                : ""
                        }

                        <h3>
                            ${place.displayName}
                        </h3>

                        <div>
                            <strong>
                                ${rating}
                            </strong>

                            ${reviews
                                ? ` · ${reviews}`
                                : ""
                            }
                        </div>

                        <div style="
                            margin-top: 8px;
                        ">
                            <strong>
                                Connected Score:
                                ${connectedScore}/100
                            </strong>
                        </div>

                        <div style="
                            margin-top: 6px;
                        ">
                            ${distanceMiles.toFixed(1)}
                            miles from Ashburn
                        </div>

                        <div style="
                            margin-top: 6px;
                        ">
                            ✈ ${distanceToIAD.toFixed(1)}
                            miles from IAD
                        </div>

                        ${
                            nearestEV.station
                                ? `
                                    <div style="
                                        margin-top: 10px;
                                    ">

                                        <strong>
                                            ⚡ Nearest EV Charger
                                        </strong>

                                        <br>

                                        ${nearestEV.station.displayName}

                                        <br>

                                        ${nearestEV.distance.toFixed(1)}
                                        miles away
                                    </div>
                                `
                                : ""
                        }

                        <div style="
                            margin-top: 10px;
                        ">
                            ${place.formattedAddress}
                        </div>

                        <div style="
                            margin-top: 10px;
                        ">
                            <strong>
                                Today's Hours
                            </strong>

                            <br>

                            ${todayHours}
                        </div>

                        <details style="
                            margin-top: 8px;
                        ">

                            <summary style="
                                cursor: pointer;
                            ">
                                View full hours
                            </summary>

                            <div style="
                                margin-top: 8px;
                            ">
                                ${fullHours}
                            </div>

                        </details>

                    </div>
                `);


                infoWindow.open({
                    anchor:
                        breweryMarker,

                    map
                });
            }


            // Brewery marker click

            breweryMarker.addListener(
                "click",
                openBreweryPopup
            );


            // Brewery sidebar card click

            card.addEventListener(
                "click",
                openBreweryPopup
            );
        }
    );

    // ========================================
// RESTAURANTS
// ========================================

restaurants.forEach(
    (place, index) => {

        if (!place.location) {
            return;
        }


        // ----------------------------------------
        // RESTAURANT INFORMATION
        // ----------------------------------------

        const distanceMiles =
            calculateDistanceMiles(
                ashburn.lat,
                ashburn.lng,
                place.location.lat(),
                place.location.lng()
            );

        const distanceToIAD =
            calculateDistanceMiles(
                place.location.lat(),
                place.location.lng(),
                iad.lat,
                iad.lng
            );

        const nearestEV =
            findNearestEVStation(place);

        const rating =
            getRatingText(place);

        const reviews =
            getReviewText(place);

        const photoUrl =
            getPhotoUrl(place);


        // ----------------------------------------
        // RESTAURANT MARKER
        // ----------------------------------------

        const restaurantMarker =
            new google.maps.Marker({

                position:
                    place.location,

                map: null,

                title:
                    place.displayName,

                icon: {
                    url:
                        "images/blue_fork.png",

                    scaledSize:
                        new google.maps.Size(
                            50,
                            50
                        )
                }
            });


        restaurantMarkers.push(
            restaurantMarker
        );


        // ----------------------------------------
        // RESTAURANT SIDEBAR CARD
        // ----------------------------------------

        const restaurantCard =
            document.createElement("div");

        restaurantCard.className =
            "brewery-card";

        restaurantCard.innerHTML = `

            ${
                photoUrl
                    ? `
                        <img
                            src="${photoUrl}"
                            alt="${place.displayName}"
                            class="brewery-photo"
                        >
                    `
                    : ""
            }

            <strong>
                ${index + 1}.
                ${place.displayName}
            </strong>

            <br>

            ${rating}

            ${reviews
                ? ` · ${reviews}`
                : ""
            }

            <br>

            <small>
                ${distanceMiles.toFixed(1)}
                miles from Ashburn
            </small>

            <br>

            <small>
                ✈ ${distanceToIAD.toFixed(1)}
                miles from IAD
            </small>

            <br>

            <small>
                ${place.formattedAddress}
            </small>

            <br>

            ${
                nearestEV.station
                    ? `
                        <small>
                            ⚡ Nearest EV:
                            ${nearestEV.station.displayName}
                            (${nearestEV.distance.toFixed(1)} mi)
                        </small>
                    `
                    : ""
            }
        `;


        restaurantList.appendChild(
            restaurantCard
        );


        // ----------------------------------------
        // RESTAURANT POPUP
        // ----------------------------------------

        function openRestaurantPopup() {

            infoWindow.setContent(`
                <div style="
                    max-width: 280px;
                    font-family: Arial, sans-serif;
                ">

                    ${
                        photoUrl
                            ? `
                                <img
                                    src="${photoUrl}"
                                    alt="${place.displayName}"
                                    style="
                                        width: 100%;
                                        height: 150px;
                                        object-fit: cover;
                                        border-radius: 8px;
                                        margin-bottom: 8px;
                                    "
                                >
                            `
                            : ""
                    }

                    <h3>
                        ${place.displayName}
                    </h3>

                    <div>
                        ${rating}
                        ${reviews
                            ? ` · ${reviews}`
                            : ""
                        }
                    </div>

                    <div style="
                        margin-top: 8px;
                    ">
                        ${place.formattedAddress}
                    </div>

                    <div style="
                        margin-top: 8px;
                    ">
                        ${distanceMiles.toFixed(1)}
                        miles from Ashburn
                    </div>

                    <div style="
                        margin-top: 6px;
                    ">
                        ✈ ${distanceToIAD.toFixed(1)}
                        miles from IAD
                    </div>

                </div>
            `);

            infoWindow.open({
                anchor:
                    restaurantMarker,

                map
            });

            map.panTo(
                place.location
            );

            map.setZoom(14);
        }


        restaurantMarker.addListener(
            "click",
            openRestaurantPopup
        );


        restaurantCard.addEventListener(
            "click",
            openRestaurantPopup
        );
    }
);

    // ========================================
    // EV CHARGING STATIONS
    // ========================================

    evStations.forEach((station) => {
        if (!station.location) {
            return;
        }

        const evMarker =
            new google.maps.Marker({
                position:
                    station.location,

                map,

                title:
                    station.displayName,

                icon: {
                    url:
                        "images/ev-charge.png",

                    scaledSize:
                        new google.maps.Size(
                            28,
                            28
                        )
                }
            });

        evMarkers.push(
            evMarker
        );


        evMarker.addListener(
            "click",
            () => {
                infoWindow.setContent(`
                    <div style="
                        max-width: 260px;
                        font-family: Arial, sans-serif;
                    ">

                        <h3>
                            ${station.displayName}
                        </h3>

                        <div>
                            ${station.formattedAddress}
                        </div>

                        <div style="
                            margin-top: 8px;
                        ">
                            ⚡ EV Charging Station
                        </div>

                    </div>
                `);


                infoWindow.open({
                    anchor:
                        evMarker,

                    map
                });
            }
        );
    });


    // ========================================
    // INITIAL SIDEBAR STATE
    // ========================================

    breweryList.style.display =
        "block";

    coffeeList.style.display =
        "none";
    
    restaurantList.style.display =
    "none";  

    sidebarTitle.textContent =
        "Top Breweries Near Ashburn";


    // ========================================
    // BREWERY FILTER
    // ========================================

    breweryButton.addEventListener(
        "click",
        () => {
            toggleMarkerGroup(
                breweryMarkers,
                breweryButton
            );

            breweryList.style.display =
                "block";

            coffeeList.style.display =
                "none";

            restaurantList.style.display =
                "none";

            sidebarTitle.textContent =
                "Top Breweries Near Ashburn";
        }
    );


    // ========================================
    // EV FILTER
    // ========================================

    evButton.addEventListener(
        "click",
        () => {
            toggleMarkerGroup(
                evMarkers,
                evButton
            );

            // Remove connection line
            // when EV markers are hidden

            if (
                !evButton.classList
                    .contains("active") &&
                connectionLine
            ) {
                connectionLine.setMap(
                    null
                );
            }
        }
    );


    // ========================================
    // IAD BEER FILTER
    // ========================================

    iadBeerButton.addEventListener(
        "click",
        () => {
            toggleMarkerGroup(
                iadBeerMarkers,
                iadBeerButton
            );
        }
    );


    // ========================================
    // COFFEE + WI-FI FILTER
    // ========================================

    coffeeButton.addEventListener(
        "click",
        () => {
            toggleMarkerGroup(
                coffeeMarkers,
                coffeeButton
            );

 breweryList.style.display =
    "none";

coffeeList.style.display =
    "block";

restaurantList.style.display =
    "none";    

sidebarTitle.textContent =
    "Coffee & Work Spots Near Ashburn";
}
);


// ========================================
// RESTAURANT FILTER
// ========================================

restaurantButton.addEventListener(
    "click",
    () => {

        toggleMarkerGroup(
            restaurantMarkers,
            restaurantButton
        );

        breweryList.style.display =
            "none";

        coffeeList.style.display =
            "none";

        restaurantList.style.display =
            "block";

        sidebarTitle.textContent =
            "Restaurants Near Ashburn";
    }
);

}


// ========================================
// ASHBURN CONNECTED REVIEWS API
// ========================================

const REVIEWS_API_URL =
    "https://koc0evrwt7.execute-api.us-east-1.amazonaws.com/reviews";


async function loadReviews() {
    const reviewsList =
        document.getElementById("reviews-list");

    if (!reviewsList) {
        return;
    }

    try {
        const response =
            await fetch(REVIEWS_API_URL);

        if (!response.ok) {
            throw new Error(
                `API request failed: ${response.status}`
            );
        }

        const reviews =
            await response.json();

        reviewsList.innerHTML = "";

        if (reviews.length === 0) {
            reviewsList.textContent =
                "No local reviews yet.";

            return;
        }

        reviews.forEach((review) => {

            const card =
                document.createElement("article");

            card.className =
                "review-card";


            const title =
                document.createElement("h3");

            title.textContent =
                review.placeName;


            const details =
                document.createElement("div");

            details.className =
                "review-details";

            details.textContent =
                `${review.category} · ${review.rating} ★`;


            const reviewText =
                document.createElement("p");

            reviewText.textContent =
                review.review;


            const source =
            document.createElement("small");

            source.textContent =
            review.source
            ? `Source: ${review.source}`
             : "";

card.append(
    title,
    details,
    reviewText,
    source
);

            reviewsList.appendChild(card);
        });

    } catch (error) {

        console.error(
            "Unable to load reviews:",
            error
        );

        reviewsList.textContent =
            "Reviews are temporarily unavailable.";
    }
}


document.addEventListener(
    "DOMContentLoaded",
    loadReviews
);