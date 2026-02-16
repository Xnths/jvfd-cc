"use client"

import React, { useEffect, useRef } from 'react';
import Script from 'next/script';
import '@/styles/commutes.css';
import { siteConfig } from '@/lib/config';

// Define the configuration for the map based on the clinic's location
const MAP_CONFIG = {
    defaultTravelMode: "DRIVING",
    distanceMeasurementType: "METRIC",
    mapOptions: {
        center: {
            lat: siteConfig.contact.geo.latitude,
            lng: siteConfig.contact.geo.longitude
        },
        fullscreenControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        zoom: 14,
        zoomControl: true,
        maxZoom: 20,
        mapId: ""
    },
    // We use the environment variable for the key
    mapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
};

declare global {
    interface Window {
        google: any;
        initCommutesMap: () => void;
    }
}

export function CommutesMap() {
    const mapRef = useRef<HTMLDivElement>(null);
    const initialStatePanelRef = useRef<HTMLDivElement>(null);
    const destinationPanelRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // This function matches the 'Commutes' class logic from the provided code
        // simplified and adapted for React usage where possible, or just keeping the imperative logic
        // inside the effect since it relies heavily on DOM manipulation relative to the Google Maps API.

        window.initCommutesMap = () => {
            if (!window.google) return;

            // Configuration constants
            const MAX_NUM_DESTINATIONS = 10;
            const BIAS_BOUND_DISTANCE = 0.5;
            const HOUR_IN_SECONDS = 3600;
            const MIN_IN_SECONDS = 60;

            const STROKE_COLORS = {
                active: { innerStroke: '#4285F4', outerStroke: '#185ABC' },
                inactive: { innerStroke: '#BDC1C6', outerStroke: '#80868B' }
            };

            const MARKER_ICON_COLORS = {
                active: { fill: '#EA4335', stroke: '#C5221F', label: '#FFF' },
                inactive: { fill: '#F1F3F4', stroke: '#9AA0A6', label: '#3C4043' }
            };

            const DestinationOperation = { ADD: 'ADD', EDIT: 'EDIT', DELETE: 'DELETE' };
            const TravelMode = { DRIVING: 'DRIVING', TRANSIT: 'TRANSIT', BICYCLING: 'BICYCLING', WALKING: 'WALKING' };

            // DOM Elements
            const commutesEl = {
                map: mapRef.current,
                initialStatePanel: initialStatePanelRef.current,
                destinationPanel: destinationPanelRef.current,
                modal: modalRef.current,
            };

            if (!commutesEl.map || !commutesEl.initialStatePanel || !commutesEl.destinationPanel || !commutesEl.modal) return;

            // --- Logic adapted from provided Commutes class ---

            // Element selectors for destination panel
            const destinationPanelEl = {
                addButton: commutesEl.destinationPanel.querySelector('.add-button') as HTMLElement,
                container: commutesEl.destinationPanel.querySelector('.destinations-container') as HTMLElement,
                list: commutesEl.destinationPanel.querySelector('.destination-list') as HTMLElement,
                scrollLeftButton: commutesEl.destinationPanel.querySelector('.left-control') as HTMLElement,
                scrollRightButton: commutesEl.destinationPanel.querySelector('.right-control') as HTMLElement,
                getActiveDestination: () => commutesEl.destinationPanel?.querySelector('.destination.active') as HTMLElement,
            };

            // Element selectors for modal
            const destinationModalEl = {
                title: commutesEl.modal.querySelector('h2') as HTMLElement,
                form: commutesEl.modal.querySelector('form') as HTMLFormElement,
                destinationInput: commutesEl.modal.querySelector('input[name="destination-address"]') as HTMLInputElement,
                errorMessage: commutesEl.modal.querySelector('.error-message') as HTMLElement,
                addButton: commutesEl.modal.querySelector('.add-destination-button') as HTMLElement,
                deleteButton: commutesEl.modal.querySelector('.delete-destination-button') as HTMLElement,
                editButton: commutesEl.modal.querySelector('.edit-destination-button') as HTMLElement,
                cancelButton: commutesEl.modal.querySelector('.cancel-button') as HTMLElement,
                getTravelModeInput: () => commutesEl.modal?.querySelector('input[name="travel-mode"]:checked') as HTMLInputElement,
            };

            let commutesMap: any;
            let activeDestinationIndex: number | undefined;
            let origin = MAP_CONFIG.mapOptions.center;
            let destinations: any[] = [];
            let markerIndex = 0;
            let lastActiveEl: HTMLElement | null;

            const markerIconConfig = {
                path: 'M10 27c-.2 0-.2 0-.5-1-.3-.8-.7-2-1.6-3.5-1-1.5-2-2.7-3-3.8-2.2-2.8-3.9-5-3.9-8.8C1 4.9 5 1 10 1s9 4 9 8.9c0 3.9-1.8 6-4 8.8-1 1.2-1.9 2.4-2.8 3.8-1 1.5-1.4 2.7-1.6 3.5-.3 1-.4 1-.6 1Z',
                fillOpacity: 1,
                strokeWeight: 1,
                anchor: new window.google.maps.Point(15, 29),
                scale: 1.2,
                labelOrigin: new window.google.maps.Point(10, 9),
            };
            const originMarkerIcon = {
                ...markerIconConfig,
                fillColor: MARKER_ICON_COLORS.active.fill,
                strokeColor: MARKER_ICON_COLORS.active.stroke,
            };
            const destinationMarkerIcon = {
                ...markerIconConfig,
                fillColor: MARKER_ICON_COLORS.inactive.fill,
                strokeColor: MARKER_ICON_COLORS.inactive.stroke,
            };

            const bikeLayer = new window.google.maps.BicyclingLayer();
            const publicTransitLayer = new window.google.maps.TransitLayer();

            function initMapView() {
                commutesMap = new window.google.maps.Map(commutesEl.map, MAP_CONFIG.mapOptions);
                const defaultTravelModeEnum = parseTravelModeEnum(MAP_CONFIG.defaultTravelMode);
                setTravelModeLayer(defaultTravelModeEnum);
                createMarker(origin);
            }

            function initCommutesPanel() {
                // Better scoping: 
                const scopedAddButtons = [
                    commutesEl.initialStatePanel?.querySelector('.add-button'),
                    destinationPanelEl.addButton
                ].filter(Boolean) as HTMLElement[];

                scopedAddButtons.forEach(addButton => {
                    addButton.addEventListener('click', () => {
                        destinationModalEl.title.innerHTML = 'Adicionar destino';
                        hideElement(destinationModalEl.deleteButton);
                        hideElement(destinationModalEl.editButton);
                        showElement(destinationModalEl.addButton);
                        showModal();
                        const travelModeEnum = parseTravelModeEnum(MAP_CONFIG.defaultTravelMode) || TravelMode.DRIVING;
                        const travelModeId = travelModeEnum.toLowerCase() + '-mode';
                        const radio = destinationModalEl.form.querySelector(`#${travelModeId}`) as HTMLInputElement;
                        if (radio) radio.checked = true;
                    });
                });

                destinationPanelEl.scrollLeftButton.addEventListener('click', handleScrollButtonClick);
                destinationPanelEl.scrollRightButton.addEventListener('click', handleScrollButtonClick);

                destinationPanelEl.list.addEventListener('keydown', (e: Event) => {
                    const kEvent = e as KeyboardEvent;
                    if (kEvent.key === 'Enter' && kEvent.target !== destinationPanelEl.getActiveDestination()) {
                        (kEvent.target as HTMLElement).click();
                        kEvent.preventDefault();
                    }
                });
            }

            function initCommutesModal() {
                const boundConfig = {
                    north: origin.lat + BIAS_BOUND_DISTANCE,
                    south: origin.lat - BIAS_BOUND_DISTANCE,
                    east: origin.lng + BIAS_BOUND_DISTANCE,
                    west: origin.lng - BIAS_BOUND_DISTANCE,
                };

                const destinationFormReset = function () {
                    destinationModalEl.destinationInput.classList.remove('error');
                    destinationModalEl.errorMessage.innerHTML = '';
                    destinationModalEl.form.reset();
                    destinationToAdd = null;
                };

                const autocompleteOptions = {
                    bounds: boundConfig,
                    fields: ['place_id', 'geometry', 'name'],
                };
                const autocomplete = new window.google.maps.places.Autocomplete(
                    destinationModalEl.destinationInput, autocompleteOptions);

                let destinationToAdd: any;
                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place.geometry || !place.geometry.location) {
                        return;
                    } else {
                        destinationToAdd = place;
                        destinationModalEl.getTravelModeInput()?.focus();
                    }
                    destinationModalEl.destinationInput.classList.remove('error');
                    destinationModalEl.errorMessage.innerHTML = '';
                });

                destinationModalEl.addButton.addEventListener('click', () => {
                    const isValidInput = validateDestinationInput(destinationToAdd);
                    if (!isValidInput) return;
                    const selectedTravelMode = destinationModalEl.getTravelModeInput().value;
                    addDestinationToList(destinationToAdd, selectedTravelMode);
                    destinationFormReset();
                    hideModal();
                });

                destinationModalEl.editButton.addEventListener('click', () => {
                    const destination = { ...destinations[activeDestinationIndex!] };
                    const selectedTravelMode = destinationModalEl.getTravelModeInput().value;
                    const isSameDestination = destination.name === destinationModalEl.destinationInput.value;
                    const isSameTravelMode = destination.travelModeEnum === selectedTravelMode;
                    if (isSameDestination && isSameTravelMode) {
                        hideModal();
                        return;
                    }
                    if (!isSameDestination) {
                        const isValidInput = validateDestinationInput(destinationToAdd);
                        if (!isValidInput) return;
                        destination.name = destinationToAdd.name;
                        destination.place_id = destinationToAdd.place_id;
                        destination.url = generateMapsUrl(destinationToAdd, selectedTravelMode);
                    }
                    if (!isSameTravelMode) {
                        destination.travelModeEnum = selectedTravelMode;
                        destination.url = generateMapsUrl(destination, selectedTravelMode);
                    }
                    destinationFormReset();
                    getDirections(destination)
                        .then((response) => {
                            if (!response) return;
                            removeDirectionsFromMapView(destination);
                            destinations[activeDestinationIndex!] = destination;
                            getCommutesInfo(response, destination);
                            assignMapObjectListeners(destination, activeDestinationIndex!);
                            updateCommutesPanel(destination, activeDestinationIndex!, DestinationOperation.EDIT);
                            handleRouteClick(destination, activeDestinationIndex!);
                            const newEditButton = destinationPanelEl.list.children.item(activeDestinationIndex!)?.querySelector('.edit-button') as HTMLElement;
                            if (newEditButton) newEditButton.focus();
                        })
                        .catch((e) => console.error('Editing directions failed due to ' + e));
                    hideModal();
                });

                destinationModalEl.cancelButton.addEventListener('click', () => {
                    destinationFormReset();
                    hideModal();
                });

                destinationModalEl.deleteButton.addEventListener('click', () => {
                    removeDirectionsFromMapView(destinations[activeDestinationIndex!]);
                    updateCommutesPanel(destinations[activeDestinationIndex!], activeDestinationIndex!, DestinationOperation.DELETE);
                    activeDestinationIndex = undefined;
                    destinationFormReset();
                    let elToFocus: HTMLElement | null;
                    if (destinations.length) {
                        const lastIndex = destinations.length - 1;
                        handleRouteClick(destinations[lastIndex], lastIndex);
                        elToFocus = destinationPanelEl.getActiveDestination();
                    } else {
                        elToFocus = commutesEl.initialStatePanel?.querySelector('.add-button') as HTMLElement;
                    }
                    hideModal(elToFocus);
                });

                if (commutesEl.modal) {
                    commutesEl.modal.onmousedown = function (event) {
                        if (event.target === commutesEl.modal) {
                            destinationFormReset();
                            hideModal();
                        }
                    };
                }
            }

            // Helper functions
            function parseTravelModeEnum(travelModeString: string) {
                switch (travelModeString) {
                    case 'DRIVING': return TravelMode.DRIVING;
                    case 'BICYCLING': return TravelMode.BICYCLING;
                    case 'PUBLIC_TRANSIT': return TravelMode.TRANSIT;
                    case 'WALKING': return TravelMode.WALKING;
                    default: return null;
                }
            }

            function setTravelModeLayer(travelModeEnum: any) {
                switch (travelModeEnum) {
                    case TravelMode.BICYCLING:
                        publicTransitLayer.setMap(null);
                        bikeLayer.setMap(commutesMap);
                        break;
                    case TravelMode.TRANSIT:
                        bikeLayer.setMap(null);
                        publicTransitLayer.setMap(commutesMap);
                        break;
                    default:
                        publicTransitLayer.setMap(null);
                        bikeLayer.setMap(null);
                }
            }

            function createMarker(location: any, label?: string) {
                const isOrigin = label === undefined;
                const markerIcon = isOrigin ? originMarkerIcon : destinationMarkerIcon;
                const labelColor = isOrigin ? MARKER_ICON_COLORS.active.label : MARKER_ICON_COLORS.inactive.label;
                const labelText = isOrigin ? '●' : label;

                const mapOptions = {
                    position: location,
                    map: commutesMap,
                    label: {
                        text: labelText,
                        fontFamily: 'Arial, sans-serif',
                        color: labelColor,
                        fontSize: '16px',
                    },
                    icon: markerIcon
                } as any;
                if (isOrigin) {
                    mapOptions.label.fontSize = '20px';
                }
                return new window.google.maps.Marker(mapOptions);
            }

            function getNextMarkerLabel() {
                const markerLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                const label = markerLabels[markerIndex];
                markerIndex = (markerIndex + 1) % markerLabels.length;
                return label;
            }

            function validateDestinationInput(destinationToAdd: any) {
                let errorMessage;
                let isValidInput = false;
                if (!destinationToAdd) {
                    errorMessage = 'Sem detalhes para o destino informado.';
                } else if (destinations.length > MAX_NUM_DESTINATIONS) {
                    errorMessage = 'Não é possível adicionar mais que ' + MAX_NUM_DESTINATIONS + ' destinos';
                } else if (destinations && destinations.find(d => d.place_id === destinationToAdd.place_id)) {
                    errorMessage = 'Destino já adicionado';
                } else {
                    isValidInput = true;
                }
                if (!isValidInput) {
                    destinationModalEl.errorMessage.innerHTML = errorMessage || 'Erro desconhecido';
                    destinationModalEl.destinationInput.classList.add('error');
                }
                return isValidInput;
            }

            function addDestinationToList(destinationToAdd: any, travelModeEnum: any) {
                const destinationConfig = createDestinationConfig(destinationToAdd, travelModeEnum);
                const newDestinationIndex = destinations.length;

                getDirections(destinationConfig)
                    .then((response) => {
                        if (!response) return;
                        destinations.push(destinationConfig);
                        getCommutesInfo(response, destinationConfig);
                        assignMapObjectListeners(destinationConfig, newDestinationIndex);
                        updateCommutesPanel(destinationConfig, newDestinationIndex, DestinationOperation.ADD);
                        handleRouteClick(destinationConfig, newDestinationIndex);
                        destinationPanelEl.addButton.focus();
                    })
                    .catch((e) => console.error('Adding destination failed due to ' + e));
            }

            function createDestinationConfig(destinationToAdd: any, travelModeEnum: any, label?: string) {
                return {
                    name: destinationToAdd.name,
                    place_id: destinationToAdd.place_id,
                    label: label || getNextMarkerLabel(),
                    travelModeEnum: travelModeEnum,
                    url: generateMapsUrl(destinationToAdd, travelModeEnum),
                };
            }

            function generateMapsUrl(destination: any, travelModeEnum: any) {
                let googleMapsUrl = 'https://www.google.com/maps/dir/?api=1';
                googleMapsUrl += `&origin=${origin.lat},${origin.lng}`;
                googleMapsUrl += '&destination=' + encodeURIComponent(destination.name) + '&destination_place_id=' + destination.place_id;
                googleMapsUrl += '&travelmode=' + travelModeEnum.toLowerCase();
                return googleMapsUrl;
            }

            function getDirections(destination: any) {
                const request = {
                    origin: origin,
                    destination: { 'placeId': destination.place_id },
                    travelMode: destination.travelModeEnum,
                    unitSystem: MAP_CONFIG.distanceMeasurementType === 'METRIC' ? window.google.maps.UnitSystem.METRIC : window.google.maps.UnitSystem.IMPERIAL,
                };
                const directionsService = new window.google.maps.DirectionsService();
                return directionsService.route(request).then((response: any) => response);
            }

            function getCommutesInfo(directionResponse: any, destination: any) {
                if (!directionResponse) return;
                const path = directionResponse.routes[0].overview_path;
                const bounds = directionResponse.routes[0].bounds;
                const directionLeg = directionResponse.routes[0].legs[0];
                const destinationLocation = directionLeg.end_location;
                const distance = directionLeg.distance.text;
                const duration = convertDurationValueAsString(directionLeg.duration.value);

                const innerStroke = new window.google.maps.Polyline({
                    path: path,
                    strokeColor: STROKE_COLORS.inactive.innerStroke,
                    strokeOpacity: 1.0,
                    strokeWeight: 3,
                    zIndex: 10
                });

                const outerStroke = new window.google.maps.Polyline({
                    path: path,
                    strokeColor: STROKE_COLORS.inactive.outerStroke,
                    strokeOpacity: 1.0,
                    strokeWeight: 6,
                    zIndex: 1
                });

                const marker = createMarker(destinationLocation, destination.label);

                innerStroke.setMap(commutesMap);
                outerStroke.setMap(commutesMap);

                destination.distance = distance;
                destination.duration = duration;
                destination.marker = marker;
                destination.polylines = { innerStroke, outerStroke };
                destination.bounds = bounds;
            }

            function convertDurationValueAsString(durationValue: number) {
                if (!durationValue) return '';
                if (durationValue < MIN_IN_SECONDS) return '<1 min';
                if (durationValue > HOUR_IN_SECONDS * 10) return '10+ horas';
                const hours = Math.floor(durationValue / HOUR_IN_SECONDS);
                const minutes = Math.floor(durationValue % HOUR_IN_SECONDS / 60);
                const hoursString = hours > 0 ? hours + ' h' : '';
                const minutesString = minutes > 0 ? minutes + ' min' : '';
                const spacer = hoursString && minutesString ? ' ' : '';
                return hoursString + spacer + minutesString;
            }

            function assignMapObjectListeners(destination: any, destinationIdx: number) {
                window.google.maps.event.clearListeners(destination.marker, 'click');
                window.google.maps.event.addListener(destination.marker, 'click', () => {
                    handleRouteClick(destination, destinationIdx);
                });
                for (const strokeLine in destination.polylines) {
                    window.google.maps.event.clearListeners(destination.polylines[strokeLine], 'click');
                    window.google.maps.event.addListener(destination.polylines[strokeLine], 'click', () => {
                        handleRouteClick(destination, destinationIdx);
                    });
                }
            }

            function handleRouteClick(destination: any, destinationIdx: number) {
                if (activeDestinationIndex !== undefined && destinations[activeDestinationIndex]) {
                    const prevDest = destinations[activeDestinationIndex];
                    prevDest.polylines.innerStroke.setOptions({ strokeColor: STROKE_COLORS.inactive.innerStroke, zIndex: 2 });
                    prevDest.polylines.outerStroke.setOptions({ strokeColor: STROKE_COLORS.inactive.outerStroke, zIndex: 1 });
                    prevDest.marker.setIcon(destinationMarkerIcon);
                    prevDest.marker.label.color = MARKER_ICON_COLORS.inactive.label;

                    const activeDestinationEl = destinationPanelEl.getActiveDestination();
                    if (activeDestinationEl) activeDestinationEl.classList.remove('active');
                }

                activeDestinationIndex = destinationIdx;
                setTravelModeLayer(destination.travelModeEnum);

                const newDestinationEl = destinationPanelEl.list.querySelectorAll('.destination')[destinationIdx] as HTMLElement;
                if (newDestinationEl) {
                    newDestinationEl.classList.add('active');
                    newDestinationEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                destination.polylines.innerStroke.setOptions({ strokeColor: STROKE_COLORS.active.innerStroke, zIndex: 101 });
                destination.polylines.outerStroke.setOptions({ strokeColor: STROKE_COLORS.active.outerStroke, zIndex: 99 });
                destination.marker.setIcon(originMarkerIcon);
                destination.marker.label.color = '#ffffff';

                commutesMap.fitBounds(destination.bounds);
            }

            function removeDirectionsFromMapView(destination: any) {
                destination.polylines.innerStroke.setMap(null);
                destination.polylines.outerStroke.setMap(null);
                destination.marker.setMap(null);
            }

            function updateCommutesPanel(destination: any, destinationIdx: number, destinationOperation: string) {
                switch (destinationOperation) {
                    case DestinationOperation.ADD:
                        hideElement(commutesEl.initialStatePanel as HTMLElement);
                        showElement(commutesEl.destinationPanel as HTMLElement);
                    // fall through
                    case DestinationOperation.EDIT:
                        buildDestinationCardTemplate(destination, destinationIdx, destinationOperation);
                        break;
                    case DestinationOperation.DELETE:
                        destinations.splice(destinationIdx, 1);
                        destinationPanelEl.list.innerHTML = '';
                        for (let i = 0; i < destinations.length; i++) {
                            buildDestinationCardTemplate(destinations[i], i, DestinationOperation.ADD);
                            assignMapObjectListeners(destinations[i], i);
                        }
                        break;
                }
                if (!destinations.length) {
                    showElement(commutesEl.initialStatePanel as HTMLElement);
                    hideElement(commutesEl.destinationPanel as HTMLElement);
                    activeDestinationIndex = undefined;
                    return;
                }
            }

            function buildDestinationCardTemplate(destination: any, destinationIdx: number, destinationOperation: string) {
                const template = generateDestinationTemplate(destination);
                let editButtonEl;

                if (destinationOperation === DestinationOperation.ADD) {
                    destinationPanelEl.list.insertAdjacentHTML('beforeend', `<div class="destination-container">${template}</div>`);
                    const destinationContainerEl = destinationPanelEl.list.lastElementChild as HTMLElement;
                    destinationContainerEl.addEventListener('click', () => handleRouteClick(destination, destinationIdx));
                    editButtonEl = destinationContainerEl.querySelector('.edit-button');
                } else if (destinationOperation === DestinationOperation.EDIT) {
                    const activeDest = destinationPanelEl.getActiveDestination();
                    const container = activeDest?.parentElement;
                    if (container) {
                        container.innerHTML = template;
                        container.addEventListener('click', () => handleRouteClick(destination, destinationIdx));
                        editButtonEl = container.querySelector('.edit-button');
                    }
                }

                if (editButtonEl) {
                    editButtonEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        destinationModalEl.title.innerHTML = 'Editar destino';
                        destinationModalEl.destinationInput.value = destination.name;
                        showElement(destinationModalEl.deleteButton);
                        showElement(destinationModalEl.editButton);
                        hideElement(destinationModalEl.addButton);
                        showModal();
                        const travelModeId = destination.travelModeEnum.toLowerCase() + '-mode';
                        const radio = destinationModalEl.form.querySelector(`#${travelModeId}`) as HTMLInputElement;
                        if (radio) radio.checked = true;
                    });
                }
            }

            function generateDestinationTemplate(destination: any) {
                const travelMode = destination.travelModeEnum.toLowerCase();
                return `
            <div class="destination" tabindex="0" role="button">
              <div class="destination-content">
                <div class="metadata">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                      <use href="#commutes-${travelMode}-icon"/>
                  </svg>
                  ${destination.distance}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                    <use href="#commutes-arrow-icon"/>
                  </svg>
                  <span class="location-marker">${destination.label}</span>
                </div>
                <div class="address">Para
                  <abbr title="${destination.name}">${destination.name}</abbr>
                </div>
                <div class="destination-eta">${destination.duration}</div>
              </div>
            </div>
    
            <div class="destination-controls">
              <a class="directions-button" href="${destination.url}" target="_blank"
                 aria-label="Link to directions in Google Maps">
                <svg aria-label="Directions icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                  <use href="#commutes-directions-icon"/>
                </svg>
              </a>
              <button class="edit-button" aria-label="Edit Destination">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                  <use href="#commutes-edit-icon"/>
                </svg>
                Editar
              </button>
            </div>`;
            }

            // Helpers for Hide/Show
            function hideElement(el: HTMLElement, focusEl?: HTMLElement) {
                if (el) el.classList.add('hide');
                if (focusEl) focusEl.focus();
            }
            function showElement(el: HTMLElement, focusEl?: HTMLElement) {
                if (el) el.classList.remove('hide');
                if (focusEl) focusEl.focus();
            }
            function hideModal(focusEl?: any) {
                hideElement(commutesEl.modal as HTMLElement, focusEl || lastActiveEl);
            }
            function showModal() {
                lastActiveEl = document.activeElement as HTMLElement;
                showElement(commutesEl.modal as HTMLElement, destinationModalEl.destinationInput);
            }

            function handleScrollButtonClick(e: Event) {
                const target = e.target as HTMLElement;
                const direction = Number(target.dataset.direction || target.getAttribute('data-direction') || 1);
                destinationPanelEl.container.scrollBy({ left: direction * 150, behavior: 'smooth' });
            }

            // Init
            initMapView();
            initCommutesPanel();
            initCommutesModal();
        };

        // Check if script already loaded
        if (window.google) {
            window.initCommutesMap();
        }

    }, []);

    return (
        <>
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${MAP_CONFIG.mapsApiKey}&libraries=places,geometry&callback=initCommutesMap`}
                strategy="lazyOnload"
            />

            {/* SVG Defs from the provided code */}
            <div style={{ display: 'none' }}>
                <svg className="hide">
                    <defs>
                        <symbol id="commutes-initial-icon">
                            <path d="M41 20H18.6c-9.5 0-10.8 13.5 0 13.5h14.5C41 33.5 41 45 33 45H17.7" stroke="#D2E3FC" strokeWidth="5"></path>
                            <path d="M41 22c.2 0 .4 0 .6-.2l.4-.5c.3-1 .7-1.7 1.1-2.5l2-3c.8-1 1.5-2 2-3 .6-1 .9-2.3.9-3.8 0-2-.7-3.6-2-5-1.4-1.3-3-2-5-2s-3.6.7-5 2c-1.3 1.4-2 3-2 5 0 1.4.3 2.6.8 3.6s1.2 2 2 3.2c.9 1 1.6 2 2 2.8.5.9 1 1.7 1.2 2.7l.4.5.6.2Zm0-10.5c-.7 0-1.3-.2-1.8-.7-.5-.5-.7-1.1-.7-1.8s.2-1.3.7-1.8c.5-.5 1.1-.7 1.8-.7s1.3.2 1.8.7c.5.5.7 1.1.7 1.8s-.2 1.3-.7 1.8c-.5.5-1.1.7-1.8.7Z" fill="#185ABC"></path>
                            <path d="m12 32-8 6v12h5v-7h6v7h5V38l-8-6Z" fill="#4285F4"></path>
                        </symbol>
                        <symbol id="commutes-add-icon">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </symbol>
                        <symbol id="commutes-driving-icon">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z" />
                            <circle cx="7.5" cy="14.5" r="1.5" />
                            <circle cx="16.5" cy="14.5" r="1.5" />
                        </symbol>
                        <symbol id="commutes-transit-icon">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zm5.66 3H6.43c.61-.52 2.06-1 5.57-1 3.71 0 5.12.46 5.66 1zM11 7v3H6V7h5zm2 0h5v3h-5V7zm3.5 10h-9c-.83 0-1.5-.67-1.5-1.5V12h12v3.5c0 .83-.67 1.5-1.5 1.5z" />
                            <circle cx="8.5" cy="14.5" r="1.5" />
                            <circle cx="15.5" cy="14.5" r="1.5" />
                        </symbol>
                        <symbol id="commutes-bicycling-icon">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z" />
                        </symbol>
                        <symbol id="commutes-walking-icon">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.56-.89-1.68-1.25-2.65-.84L6 8.3V13h2V9.6l1.8-.7" />
                        </symbol>
                        <symbol id="commutes-chevron-left-icon">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z" />
                        </symbol>
                        <symbol id="commutes-chevron-right-icon">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path xmlns="http://www.w3.org/2000/svg" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z" />
                        </symbol>
                        <symbol id="commutes-arrow-icon">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
                        </symbol>
                        <symbol id="commutes-directions-icon">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path d="M22.43 10.59l-9.01-9.01c-.75-.75-2.07-.76-2.83 0l-9 9c-.78.78-.78 2.04 0 2.82l9 9c.39.39.9.58 1.41.58.51 0 1.02-.19 1.41-.58l8.99-8.99c.79-.76.8-2.02.03-2.82zm-10.42 10.4l-9-9 9-9 9 9-9 9zM8 11v4h2v-3h4v2.5l3.5-3.5L14 7.5V10H9c-.55 0-1 .45-1 1z" />
                        </symbol>
                        <symbol id="commutes-edit-icon">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" />
                        </symbol>
                    </defs>
                </svg>
            </div>

            <main className="commutes max-w-4xl mx-auto mt-12 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="commutes-map" ref={mapRef} aria-label="Map">
                    <div className="map-view"></div>
                </div>

                <div className="commutes-info p-4">
                    <div className="commutes-initial-state" ref={initialStatePanelRef}>
                        <svg aria-label="Directions Icon" width="53" height="53" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <use href="#commutes-initial-icon" />
                        </svg>
                        <div className="description">
                            <h1 className="heading">Calcule seu trajeto</h1>
                            <p>Veja o tempo de viagem e rotas de lugares próximos</p>
                        </div>
                        <button className="add-button" autoFocus>
                            <svg aria-label="Add Icon" width="24px" height="24px" xmlns="http://www.w3.org/2000/svg">
                                <use href="#commutes-add-icon" />
                            </svg>
                            <span className="label">Adicionar origem</span>
                        </button>
                    </div>

                    <div className="commutes-destinations hide" ref={destinationPanelRef}>
                        <div className="destinations-container">
                            <div className="destination-list"></div>
                            <button className="add-button">
                                <svg aria-label="Add Icon" width="24px" height="24px" xmlns="http://www.w3.org/2000/svg">
                                    <use href="#commutes-add-icon" />
                                </svg>
                                <div className="label">Adicionar origem</div>
                            </button>
                        </div>
                        <button className="left-control hide" data-direction="-1" aria-label="Scroll left">
                            <svg width="24px" height="24px" xmlns="http://www.w3.org/2000/svg" data-direction="-1">
                                <use href="#commutes-chevron-left-icon" data-direction="-1" />
                            </svg>
                        </button>
                        <button className="right-control hide" data-direction="1" aria-label="Scroll right">
                            <svg width="24px" height="24px" xmlns="http://www.w3.org/2000/svg" data-direction="1">
                                <use href="#commutes-chevron-right-icon" data-direction="1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </main>

            <div className="commutes-modal-container" ref={modalRef}>
                <div className="commutes-modal" role="dialog" aria-modal="true" aria-labelledby="add-edit-heading">
                    <div className="content">
                        <h2 id="add-edit-heading" className="heading">Adicionar origem</h2>
                        <form id="destination-form">
                            <input type="text" id="destination-address-input" name="destination-address" placeholder="Digite um local ou endereço" autoComplete="off" required />
                            <div className="error-message" role="alert"></div>
                            <div className="travel-modes">
                                <input type="radio" name="travel-mode" id="driving-mode" value="DRIVING" aria-label="Driving travel mode" />
                                <label htmlFor="driving-mode" className="left-label" title="Carro">
                                    <svg aria-label="Driving icon" xmlns="http://www.w3.org/2000/svg">
                                        <use href="#commutes-driving-icon" />
                                    </svg>
                                </label>
                                <input type="radio" name="travel-mode" id="transit-mode" value="TRANSIT" aria-label="Public transit travel mode" />
                                <label htmlFor="transit-mode" title="Transporte Público">
                                    <svg aria-label="Public transit icon" xmlns="http://www.w3.org/2000/svg">
                                        <use href="#commutes-transit-icon" />
                                    </svg>
                                </label>
                                <input type="radio" name="travel-mode" id="bicycling-mode" value="BICYCLING" aria-label="Bicycling travel mode" />
                                <label htmlFor="bicycling-mode" title="Bicicleta">
                                    <svg aria-label="Bicycling icon" xmlns="http://www.w3.org/2000/svg">
                                        <use href="#commutes-bicycling-icon" />
                                    </svg>
                                </label>
                                <input type="radio" name="travel-mode" id="walking-mode" value="WALKING" aria-label="Walking travel mode" />
                                <label htmlFor="walking-mode" className="right-label" title="A pé">
                                    <svg aria-label="Walking icon" xmlns="http://www.w3.org/2000/svg">
                                        <use href="#commutes-walking-icon" />
                                    </svg>
                                </label>
                            </div>
                        </form>
                        <div className="modal-action-bar">
                            <button className="delete-destination-button hide" type="reset">
                                Excluir
                            </button>
                            <button className="cancel-button" type="reset">
                                Cancelar
                            </button>
                            <button className="add-destination-button" type="button">
                                Adicionar
                            </button>
                            <button className="edit-destination-button hide" type="button">
                                Pronto
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
